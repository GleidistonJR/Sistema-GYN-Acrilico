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
    return new Response(null, { status: 404, headers: privado });
  }
  const midia = await prisma.midiaWhatsApp.findUnique({ where: { mensagemId: id }, select: { mimeType: true } });
  if (!midia) return new Response(null, { status: 404, headers: privado });
  const visualizarPdf = consulta.searchParams.has('visualizarPdf');
  if (visualizarPdf && midia.mimeType.split(';')[0].toLowerCase() !== 'application/pdf') {
    return new Response(null, { status: 404, headers: privado });
  }
  try {
    const ponte = await urlPonte(prisma);
    // Behind Dokploy, request.url can use localhost while Host retains the browser's authority.
    const origem = new URL(`${consulta.protocol}//${request.headers.get('host') || consulta.host}`).origin;
    const token = await emitirTransferencia(prisma, { acao: 'download', mensagemId: id, clienteId: mensagem.clienteId,
      userId: acesso.usuario.id, sessionHash: hashToken((await cookies()).get('sessao_segura')!.value), origem });
    const url = ponte + '/arquivo?token=' + token + (consulta.searchParams.has('baixar') ? '&baixar=1' : '');
    if (visualizarPdf) {
      const headersEnvio = new Headers({ 'Accept-Encoding': 'identity' });
      const range = request.headers.get('range');
      if (range && /^bytes=(?:\d{1,12}-\d{0,12}|-\d{1,12})$/.test(range)) headersEnvio.set('Range', range);
      const original = await fetch(url, { cache: 'no-store', redirect: 'error', headers: headersEnvio,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)]) });
      if (!original.ok || !original.body) {
        await original.body?.cancel().catch(() => {});
        const status = [403, 404, 416, 429].includes(original.status) ? original.status : 502;
        const headers = new Headers(privado);
        if (status === 416 && original.headers.has('content-range')) headers.set('Content-Range', original.headers.get('content-range')!);
        return new Response(null, { status, headers });
      }
      const headers = new Headers({ ...privado, 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment', 'X-Content-Type-Options': 'nosniff' });
      for (const nome of ['Content-Length', 'Content-Range', 'Accept-Ranges']) {
        const valor = original.headers.get(nome);
        if (valor) headers.set(nome, valor);
      }
      return new Response(original.body, { status: original.status, headers });
    }
    return consulta.searchParams.has('link') ? Response.json({ url }, { headers: privado })
      : new Response(null, { status: 307, headers: { ...privado, Location: url, 'Referrer-Policy': 'no-referrer' } });
  } catch (e) { return Response.json({ erro: e instanceof Error ? e.message : 'Anexo indisponível.' }, { status: 503, headers: privado }); }
}
