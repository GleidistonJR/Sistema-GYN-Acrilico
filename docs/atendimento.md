# Atendimento e WhatsApp

## Estado implementado

Next.js 16, React 19, Prisma/PostgreSQL e serviço Node persistente para WhatsApp Web.
Migrações de clientes e mensagens aplicadas em produção em 18/11/2026 com autorização.

- /atendimento: lista compacta à esquerda, conversa ao centro, carteira/fila em dropdown,
  etiquetas, busca e paginação. Sem prévia; indicador de não lida por usuário.
- Atualização por eventos SSE com PostgreSQL LISTEN/NOTIFY diretamente no servidor
  da aplicação, inclusive na Vercel, sem depender de acesso à porta local do WhatsApp.
  Reconexão automática e consulta de contingência a cada 5 segundos quando indisponível.
  Histórico usa versões para evitar transferências sem mudanças; leitura registra apenas
  a versão exibida na conversa visível. Migração de leitura/eventos aplicada em produção.
- /atendimento/conversas/[id] redireciona ao painel com o cliente selecionado.
  Envio de texto e anexos de até 10 MB (imagem, áudio e PDF).
- /atendimento/conexao: QR Code, estado e desconexão, restritos a ADMIN.
- Contatos novos entram na fila; clientes existentes preservam seu responsável.
  Atribuição usa UPDATE condicional. ADMIN transfere/devolve à fila, com auditoria.
- Nome do contato pode ser editado em Organizar cliente por ADMIN ou por USER com
  acesso (fila compartilhada ou carteira própria), sem exigir que assuma a fila.
  Atualiza Cliente.nome, compartilhado entre logins, com notificação da alteração.
  O serviço WhatsApp preserva esse nome ao sincronizar contatos já cadastrados.
- Mensagens, identidades e anexos persistidos no PostgreSQL. Áudio reproduzível,
  imagens visualizáveis e PDFs para download.
- Respostas citadas aparecem no histórico com autor, tipo e resumo de até 1.000
  caracteres. O botão Responder seleciona a mensagem para texto, áudio ou anexo;
  é possível cancelar antes de enviar. A API valida conversa e conta e inclui a
  referência na idempotência. O worker usa quotedMessageId e impede envio sem a
  referência quando o WhatsApp não permite citar. Não duplica mídias da citação.
- Histórico recente já importado recebe citações durante a sincronização quando
  disponíveis; referências antigas indisponíveis aparecem identificadas como tal.
- Clicar na citação centraliza a mensagem original e a destaca por 3 segundos.
  Se estiver fora da lista carregada, busca somente um trecho de até 41 mensagens
  da mesma conversa/conta, com botão para voltar às recentes. Esse trecho não marca
  novas mensagens como lidas. Se a original não existir no banco, informa sem trocar
  o histórico. Suporta teclado e preferência de movimento reduzido.
- Gravação pelo microfone por até 2 minutos, prévia para ouvir, descarte e envio como
  áudio MP3 comum. Exige permissão do navegador e localhost/HTTPS. Anexar áudio
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
Na Vercel, o envio consulta o estado do serviço no banco compartilhado e grava
na fila; o computador conectado ao WhatsApp realiza a transmissão. O serviço
publica disponibilidade a cada 30 segundos, expirada após 90 segundos sem atualização.
Não é necessário expor a porta local para enviar pela Vercel. Configuração de QR,
conexão/desconexão e sincronização manual continuam exigindo acesso ao serviço local.

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

Envios entram em fila persistente, acionada por PostgreSQL NOTIFY após o commit,
com recuperação de pendências na reconexão e uma consulta de segurança a cada 30 segundos.
O histórico de clientes é reconciliado em segundo plano a cada 2 minutos por cliente
da rodada, além da importação inicial; novas mensagens continuam chegando por eventos.
O worker verifica novamente o responsável antes de transmitir. O ID do pedido previne
duplicação em requisições repetidas; o ID externo deduplica mensagens e ecos.
ACK de entrega/leitura não regride. Estados: PENDENTE, ENVIANDO, ENVIADA, ENTREGUE,
LIDA, FALHOU e INCERTO. Envios ambíguos não são repetidos automaticamente: conferir
o histórico antes de reenviar. Após reinício, ENVIANDO vira INCERTO.

Texto de saída limitado a 6.000 caracteres. Arquivos até 10 MB com assinatura e MIME
validados. Downloads exigem acesso à conversa, sem cache compartilhado, com suporte
Range para áudio. Tipos não suportados e arquivos indisponíveis são indicados na tela.
Gravações são convertidas localmente de WebM/MP4 para MP3 mono a 48 kbps pelo FFmpeg
e enviadas como áudio comum, sem forçar PTT: o Ogg anterior era entregue, mas foi
relatado como não reproduzível no Android e em outra sessão WhatsApp Web. O banco
passa a guardar exatamente o MP3 transmitido, substituindo a gravação original.
Usa ffmpeg-static (FFMPEG_PATH opcional). Falha de conversão
é FALHOU, sem transmissão; falha após chamar o WhatsApp permanece INCERTO.

## Custo e armazenamento

Medição SQL em 18/11/2026: banco completo ~27,7 MB, tabela de anexos ~17,3 MB
(inclui índices e espaço alocado), 738 mensagens e 120 anexos (~11,2 MB de conteúdo).
É uma fotografia do banco consultado, não a medição de cobrança de todas as branches.
Todos os anexos ainda ficam em PostgreSQL, sem retenção automática. Para escalar,
migrar binários para armazenamento de objetos privado, mantendo metadados e permissões
no banco. Não apagar históricos ou trocar de plano automaticamente.

Neon Free consultado em 18/11/2026: 1 GB de banco, 100 CU-h/mês e 5 GB de tráfego.
Fonte: https://neon.com/pricing . Consultas de fila e heartbeat mantêm o banco ativo
enquanto o serviço estiver ligado. Reduzir consultas não elimina cobrança por tempo
ativo: 0,25 CU durante 24h por 30 dias equivale a 180 CU-h, acima da franquia gratuita.
O uso real depende do compute configurado, horas ligadas, carga e demais branches.

## Permissões

Sessão real validada no servidor: lib/autorizacao.ts e lib/whatsapp/acesso.ts.
USER vê fila e carteira própria; pode responder em ambas sem assumir. ADMIN acessa
todos. APIs verificam sessão, origem e responsável. Worker revalida autor antes do envio.
Responder à fila não muda o responsável. A carteira de outro vendedor continua restrita.
O cookie legado não concede acesso. Colaboradores, ponto e cálculos também validam
sessão no servidor. A compilação voltou a verificar TypeScript.

## Validação

    node --test tests/atendimento.test.mjs tests/whatsapp-navegacao.test.mjs
    node --test tests/whatsapp-audio.test.mjs
    node --test tests/whatsapp-citacao.test.mjs
    node --test tests/autorizacao-http.test.mjs
    npx tsc --noEmit
    npx next build

Testes integrados exigem RUN_DATABASE_INTEGRATION=1 e serviços ativos:

    node --env-file=.env tests/atendimento-integracao.mjs
    node --env-file=.env tests/whatsapp-mensagens-integracao.mjs
    node --env-file=.env tests/inbox-integracao.mjs
    node --env-file=.env tests/fila-http-integracao.mjs
    node --env-file=.env tests/citacao-navegacao-integracao.mjs
    node --env-file=.env tests/nome-contato-integracao.mjs

Registros temporários têm IDs próprios e são removidos em finally. O teste de mensagens
usa provedor simulado e não envia a clientes reais. Verifica LID, responsável,
deduplicação, eco, envio, anexo, ACK, envio incerto, permissões, idempotência HTTP e mídia.
Histórico real de um cliente recuperado e reconexão real validada após reinício.
O envio externo final depende do uso pela empresa.

Para migrações usar URL direta PostgreSQL, evitando locks retidos pelo pooler.
Não executar reset do banco de produção.

Referências: https://wwebjs.dev/guide/creating-your-bot/authentication
https://docs.wwebjs.dev/Client.html
# Fotos dos contatos

As fotos da lista são opcionais: iniciais aparecem imediatamente e voltam se a imagem falhar. Um IntersectionObserver solicita apenas os contatos visíveis, agrupados em uma chamada autenticada, com as mesmas permissões da conversa. A lista e a fila de mensagens não aguardam fotos.

`FotoContato` guarda somente URL e data, nunca os bytes da imagem. Cache de 24 horas inclui contatos sem foto; erros transitórios têm espera de uma hora. O worker recebe `whatsapp_fotos` por NOTIFY, busca uma foto de cada vez com pausa de 500 ms e aproveita o heartbeat de 30 segundos para recuperar notificações perdidas. O navegador consulta resultados pendentes a cada 10 segundos por até seis tentativas e então reduz para cinco minutos; consultas concluídas ficam em memória por 30 minutos. Abas ocultas não consultam fotos. Imagens usam HTTPS de CDN WhatsApp/Meta, carregamento lazy e decodificação assíncrona.

Validação: `node --test tests/whatsapp-fotos.test.mjs`; `RUN_DATABASE_INTEGRATION=1 node --env-file=.env tests/fotos-integracao.mjs` (fixtures temporárias, permissões, rolagem, imagens simuladas e fallback).


## Latência de atendimento

A rota SSE compartilha uma conexão LISTEN direta por instância da aplicação entre as abas conectadas e a fecha ao sair o último consumidor. Não faz consultas periódicas ao Neon: transmite somente invalidações vazias, agrupadas por 40 ms. Cada busca de dados revalida permissões. O stream renova após 55 segundos para reautenticar, com maxDuration de 60 segundos, heartbeat de 15 segundos e fallback de cinco segundos somente durante falhas. A conexão direta é necessária porque o pool transacional não preserva LISTEN; as consultas normais continuam no pool Prisma.

A fila serial prioriza envio, depois eventos recebidos, depois histórico. Mantém o processamento de ecos depois da gravação do envio e intercala recebimentos após quatro lotes de saída. Uma operação já em execução (por exemplo download de anexo) ainda precisa terminar. Identidades de números já verificadas são reutilizadas. Autorização e reserva PENDENTE → ENVIANDO usam uma operação atômica com lock do cliente; o estado ambíguo continua sem reenvio automático. A resposta do POST inclui a mensagem persistida, liberando o compositor sem esperar outra leitura do histórico.

Validação: `node --test tests/whatsapp-fila.test.mjs tests/canal-eventos.test.mjs`; `RUN_DATABASE_INTEGRATION=1 node --env-file=.env tests/latencia-atendimento-integracao.mjs`. A variável TEST_BASE_URL permite validar a Vercel. O teste mede registro no banco → exibição/status, com conta simulada; não mede entrega real a um celular. O teste whatsapp-mensagens-integracao.mjs cobre provedor simulado, NOTIFY, autorização, deduplicação, áudio e citações.

Referências técnicas: https://neon.com/docs/connect/connection-pooling e https://vercel.com/docs/functions/configuring-functions/duration .

## Apelido e assinatura por login

Em Atendimento → Meu apelido, ADMIN e USER podem salvar seu próprio apelido (1–40 caracteres). O servidor usa somente o usuário autenticado; IDs e assinaturas enviados pelo navegador não escolhem outro autor. O campo User.apelido é compartilhado entre dispositivos daquele login. Sem personalização, usa o primeiro nome do colaborador, ou Atendimento.

Textos e legendas de imagem/PDF são persistidos com `*Apelido:*` e uma quebra de linha antes do corpo. Áudios não recebem cabeçalho nem mensagem extra. O histórico conserva a assinatura usada no momento do envio. O hash de idempotência continua baseado no conteúdo digitado, evitando duplicação se o apelido mudar entre a primeira tentativa e uma repetição. O apelido vem da consulta de sessão já existente, sem outra leitura por envio. A tela exibe esse cabeçalho em negrito sem interpretar HTML.

Validação: `node --test tests/assinatura.test.mjs`; `RUN_DATABASE_INTEGRATION=1 node --env-file=.env tests/apelido-integracao.mjs`. O teste de integração usa dois USER e um cliente temporário sem telefone ou identidade WhatsApp, portanto não possui destinatário real.
