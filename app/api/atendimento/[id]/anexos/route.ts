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
    const { nome, mimeType, tamanho } = JSON.parse(body);
    if (typeof nome !== 'string' || typeof mimeType !== 'string' || mimeType.length > 100 || !Number.isSafeInteger(tamanho) || tamanho <= 0 || tamanho > LIMITE_MIDIA) throw new Error('O arquivo deve ter até 90 MB.');
    if (!/^(application\/pdf|image\/(jpeg|png|webp|gif)|audio\/(ogg|mpeg|mp4|wav|webm)|video\/(mp4|webm|quicktime))$/.test(mimeType.split(';')[0])) throw new Error('Envie imagem, vídeo, áudio ou PDF compatível.');
    const url = await urlPonte(prisma);
    const token = await emitirTransferencia(prisma, { acao: 'upload', chave: randomUUID(), clienteId: id,
      userId: acesso.usuario.id, sessionHash: hashToken((await cookies()).get('sessao_segura')!.value),
      origem: request.headers.get('origin'), nome: nomeArquivo(nome), mimeType, tamanho });
    return Response.json({ token, url: `${url}/arquivo?token=${token}` }, { headers: privado });
  } catch (e) { return Response.json({ erro: e instanceof Error ? e.message : 'Falha ao preparar anexo.' }, { status: 400, headers: privado }); }
}
