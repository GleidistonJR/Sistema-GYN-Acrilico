import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { acessoConversa, mesmaOrigem, privado } from '@/lib/whatsapp/acesso';
import { emitirTransferencia, hashToken, urlPonte } from '@/lib/whatsapp/transferencia.mjs';
import { LIMITE_MIDIA, nomeArquivo } from '@/lib/whatsapp/conteudo.mjs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!mesmaOrigem(request)) return Response.json({ erro: 'Origem inválida.' }, { status: 403 });
  const { id } = await params;
  const acesso = await acessoConversa(id);
  if (!acesso) return Response.json({ erro: 'Conversa indisponível.' }, { status: 403 });
  try {
    if (Number(request.headers.get('content-length')) > 2048) throw new Error('Solicitação inválida.');
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Solicitação inválida.');
    let body = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      body += new TextDecoder().decode(value);
      if (body.length > 2048) { await reader.cancel(); throw new Error('Solicitação inválida.'); }
    }
    const dados = JSON.parse(body);
    const sessao = {
      userId: acesso.usuario.id, sessionHash: hashToken((await cookies()).get('sessao_segura')!.value),
      origem: request.headers.get('origin'),
    };
    async function prepararUpload(nome: unknown, mimeType: unknown, tamanho: number) {
      if (typeof nome !== 'string' || typeof mimeType !== 'string' || mimeType.length > 100 || !Number.isSafeInteger(tamanho) || tamanho <= 0 || tamanho > LIMITE_MIDIA) throw new Error('O arquivo deve ter até 90 MB.');
      if (!/^(application\/pdf|image\/(jpeg|png|webp|gif)|audio\/(ogg|mpeg|mp4|wav|webm)|video\/(mp4|webm|quicktime))$/.test(mimeType.split(';')[0])) throw new Error('Envie imagem, vídeo, áudio ou PDF compatível.');
      return emitirTransferencia(prisma, { ...sessao, acao: 'upload', chave: randomUUID(), clienteId: id, nome: nomeArquivo(nome), mimeType, tamanho });
    }
    if (Object.hasOwn(dados, 'mensagemOrigemId')) {
      const mensagemId = dados.mensagemOrigemId;
      if (typeof mensagemId !== 'string' || !mensagemId || mensagemId.length > 100) throw new Error('Mensagem de origem inválida.');
      const original = await prisma.mensagemWhatsApp.findUnique({ where: { id: mensagemId }, select: {
        clienteId: true, midia: { select: { nome: true, mimeType: true } },
      } });
      if (!original?.midia || !await acessoConversa(original.clienteId)) throw new Error('O anexo original não está disponível.');
      const ponte = await urlPonte(prisma);
      const download = await emitirTransferencia(prisma, { ...sessao, acao: 'download', clienteId: original.clienteId, mensagemId });
      const controller = new AbortController();
      const signal = AbortSignal.any([request.signal, controller.signal, AbortSignal.timeout(180000)]);
      try {
        const origem = await fetch(`${ponte}/arquivo?token=${download}`, {
          cache: 'no-store', redirect: 'error', headers: { 'Accept-Encoding': 'identity' }, signal,
        });
        if (!origem.ok || !origem.body) {
          if (origem.status === 429) throw new Error('Outro anexo está sendo preparado. Tente novamente em alguns segundos.');
          throw new Error('Não foi possível obter o anexo original. Confira se ele ainda abre na conversa.');
        }
        const tamanho = Number(origem.headers.get('content-length'));
        const tipo = origem.headers.get('content-type');
        const mime = tipo && tipo !== 'application/octet-stream' ? tipo : original.midia.mimeType;
        const token = await prepararUpload(original.midia.nome, mime, tamanho);
        const envio: RequestInit & { duplex: 'half' } = {
          method: 'PUT', redirect: 'error', signal, duplex: 'half', body: origem.body,
          headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(tamanho) },
        };
        const resposta = await fetch(`${ponte}/arquivo?token=${token}`, envio);
        if (!resposta.ok) {
          if (resposta.status === 429) throw new Error('Outra transferência está em andamento. Tente novamente em alguns segundos.');
          throw new Error('Não foi possível preparar o anexo para o destinatário.');
        }
        return Response.json({ token }, { headers: privado });
      } catch (error) {
        if (error instanceof TypeError || signal.aborted) throw new Error('A conexão de arquivos falhou durante o encaminhamento. Tente novamente.');
        throw error;
      } finally { controller.abort(); }
    }
    const url = await urlPonte(prisma);
    const token = await prepararUpload(dados.nome, dados.mimeType, dados.tamanho);
    return Response.json({ token, url: `${url}/arquivo?token=${token}` }, { headers: privado });
  } catch (e) { return Response.json({ erro: e instanceof Error ? e.message : 'Falha ao preparar anexo.' }, { status: 400, headers: privado }); }
}
