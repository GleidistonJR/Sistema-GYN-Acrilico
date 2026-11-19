import { cookies } from 'next/headers';
import { emitirTransferencia, hashToken, urlPonte } from '@/lib/whatsapp/transferencia.mjs';
import { prisma } from '@/lib/prisma';
import { acessoConversa, privado } from '@/lib/whatsapp/acesso';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mensagem = await prisma.mensagemWhatsApp.findUnique({ where: { id }, select: { clienteId: true } });
  const acesso = mensagem ? await acessoConversa(mensagem.clienteId) : null;
  if (!mensagem || !acesso) return new Response(null, { status: 404, headers: privado });
  const consulta = new URL(request.url);
  if (consulta.searchParams.has('previa')) {
    const media = await prisma.midiaWhatsApp.findUnique({ where: { mensagemId: id }, select: { previa: true } });
    return media?.previa
      ? new Response(new Uint8Array(media.previa), { headers: { ...privado, 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' } })
      : new Response(null, { status: 404, headers: privado });
  }
  const midia = await prisma.midiaWhatsApp.findUnique({ where: { mensagemId: id }, select: { nome: true } });
  if (!midia) return new Response(null, { status: 404, headers: privado });
  try {
    const ponte = await urlPonte(prisma);
    const token = await emitirTransferencia(prisma, { acao: 'download', mensagemId: id, clienteId: mensagem.clienteId,
      userId: acesso.usuario.id, sessionHash: hashToken((await cookies()).get('sessao_segura')!.value), origem: new URL(request.url).origin });
    const url = ponte + '/arquivo?token=' + token + (consulta.searchParams.has('baixar') ? '&baixar=1' : '');
    return consulta.searchParams.has('link') ? Response.json({ url }, { headers: privado })
      : new Response(null, { status: 307, headers: { ...privado, Location: url, 'Referrer-Policy': 'no-referrer' } });
  } catch (e) { return Response.json({ erro: e instanceof Error ? e.message : 'Anexo indisponível.' }, { status: 503, headers: privado }); }
}
