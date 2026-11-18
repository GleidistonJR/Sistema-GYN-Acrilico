# Atendimento e WhatsApp

## Estado implementado

Next.js 16, React 19, Prisma/PostgreSQL e serviço Node persistente para WhatsApp Web.
Migrações de clientes e mensagens aplicadas em produção em 18/11/2026 com autorização.

- /atendimento: lista compacta à esquerda, conversa ao centro, carteira/fila em dropdown,
  etiquetas, busca e paginação. Sem prévia; indicador de não lida por usuário.
- Atualização por eventos SSE com PostgreSQL LISTEN/NOTIFY no serviço persistente.
  Reconexão automática e consulta de contingência a cada 5 segundos quando indisponível.
  Histórico usa versões para evitar transferências sem mudanças; leitura registra apenas
  a versão exibida na conversa visível. Migração de leitura/eventos aplicada em produção.
- /atendimento/conversas/[id] redireciona ao painel com o cliente selecionado.
  Envio de texto e anexos de até 10 MB (imagem, áudio e PDF).
- /atendimento/conexao: QR Code, estado e desconexão, restritos a ADMIN.
- Contatos novos entram na fila; clientes existentes preservam seu responsável.
  Atribuição usa UPDATE condicional. ADMIN transfere/devolve à fila, com auditoria.
- Mensagens, identidades e anexos persistidos no PostgreSQL. Áudio reproduzível,
  imagens visualizáveis e PDFs para download.
- Gravação pelo microfone por até 2 minutos, prévia para ouvir, descarte e envio como
  mensagem de voz. Exige permissão do navegador e localhost/HTTPS. Anexar áudio
  continua disponível. Respostas inteligentes ainda não implementadas.

## Operação local

Manter o computador ligado e os dois serviços em execução:

    npm run dev -- --hostname 127.0.0.1
    npm run whatsapp:dev

O WhatsApp foi iniciado em segundo plano, com logs em .whatsapp-session/logs/.
Não iniciar uma segunda cópia enquanto a porta 3001 estiver ocupada. O comando
carrega .env para o banco e .env.local para a conexão. O supervisor reinicia um
processo encerrado com espera de 2 a 30 segundos. Não há início automático com Windows.

WHATSAPP_BRIDGE_TOKEN fica em .env.local, fora do Git e do navegador. O serviço
escuta em 127.0.0.1:3001 e exige esse segredo. WHATSAPP_BRIDGE_URL,
WHATSAPP_BRIDGE_PORT e WHATSAPP_BROWSER_PATH são opcionais. Chrome/Edge usam
perfil exclusivo em .whatsapp-session/: não compartilhar essa pasta.
Reiniciar preserva a sessão; desconectar na tela revoga o aparelho.

whatsapp-web.js está fixado em 1.34.8. O adaptador scripts/whatsapp-client.mjs trata
frames invalidados durante navegação e logout duplicado. A restauração tenta novamente
o callback de conclusão quando a sessão já sincronizou. O estado conectado depende
do evento ready. Revisar esses ajustes antes de atualizar a biblioteca.

Publicar apenas o Next.js não publica o serviço persistente do WhatsApp.
127.0.0.1 aponta para o computador do servidor, não o de quem visita o site.

## Histórico e envio

scripts/whatsapp-mensagens.mjs trata message_create (entrada e saída, inclusive
pelo celular da empresa), identidades LID, telefone e confirmação de leitura/entrega.
Um LID nunca é interpretado como telefone. Há tratamento do nono dígito brasileiro.
Grupos, canais e status não entram nesta caixa de conversas individuais.

Na conexão são buscadas as últimas 50 mensagens disponíveis de cada cliente cadastrado
(até 100 clientes no carregamento inicial). Depois o serviço percorre os cadastros para
reconciliar o histórico periodicamente. O botão Sincronizar histórico prioriza a conversa.
O WhatsApp pode não disponibilizar todo o histórico antigo ou anexos expirados.
Eventos com falhas transitórias de persistência são repetidos até três vezes.

Envios entram em fila persistente, processada a cada 2 segundos quando conectado.
O worker verifica novamente o responsável antes de transmitir. O ID do pedido previne
duplicação em requisições repetidas; o ID externo deduplica mensagens e ecos.
ACK de entrega/leitura não regride. Estados: PENDENTE, ENVIANDO, ENVIADA, ENTREGUE,
LIDA, FALHOU e INCERTO. Envios ambíguos não são repetidos automaticamente: conferir
o histórico antes de reenviar. Após reinício, ENVIANDO vira INCERTO.

Texto de saída limitado a 6.000 caracteres. Arquivos até 10 MB com assinatura e MIME
validados. Downloads exigem acesso à conversa, sem cache compartilhado, com suporte
Range para áudio. Tipos não suportados e arquivos indisponíveis são indicados na tela.

## Permissões

Sessão real validada no servidor: lib/autorizacao.ts e lib/whatsapp/acesso.ts.
USER vê fila e carteira própria; responde somente a clientes próprios. ADMIN acessa
todos. APIs verificam sessão, origem e responsável. Worker revalida autor antes do envio.
O cookie legado não concede acesso. Colaboradores, ponto e cálculos também validam
sessão no servidor. A compilação voltou a verificar TypeScript.

## Validação

    node --test tests/atendimento.test.mjs tests/whatsapp-navegacao.test.mjs
    node --test tests/autorizacao-http.test.mjs
    npx tsc --noEmit
    npx next build

Testes integrados exigem RUN_DATABASE_INTEGRATION=1 e serviços ativos:

    node --env-file=.env tests/atendimento-integracao.mjs
    node --env-file=.env tests/whatsapp-mensagens-integracao.mjs
    node --env-file=.env tests/inbox-integracao.mjs

Registros temporários têm IDs próprios e são removidos em finally. O teste de mensagens
usa provedor simulado e não envia a clientes reais. Verifica LID, responsável,
deduplicação, eco, envio, anexo, ACK, envio incerto, permissões, idempotência HTTP e mídia.
Histórico real de um cliente recuperado e reconexão real validada após reinício.
O envio externo final depende do uso pela empresa.

Para migrações usar URL direta PostgreSQL, evitando locks retidos pelo pooler.
Não executar reset do banco de produção.

Referências: https://wwebjs.dev/guide/creating-your-bot/authentication
https://docs.wwebjs.dev/Client.html
