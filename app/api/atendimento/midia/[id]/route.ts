import { prisma } from '@/lib/prisma';
import { acessoConversa, privado } from '@/lib/whatsapp/acesso';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mensagem = await prisma.mensagemWhatsApp.findUnique({ where: { id }, select: { clienteId: true } });
  if (!mensagem || !await acessoConversa(mensagem.clienteId)) return new Response(null, { status: 404, headers: privado });
  const midia = await prisma.midiaWhatsApp.findUnique({ where: { mensagemId: id } });
  if (!midia) return new Response(null, { status: 404, headers: privado });
  const headers = { ...privado, 'Content-Type': midia.mimeType, 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `${midia.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(midia.nome)}`,
    'Accept-Ranges': 'bytes',
  };
  const dados = new Uint8Array(midia.dados);
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    const start = match ? Number(match[1]) : -1;
    const end = match?.[2] ? Math.min(Number(match[2]), dados.length - 1) : dados.length - 1;
    if (start < 0 || start > end || start >= dados.length) return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${dados.length}` } });
    return new Response(dados.slice(start, end + 1), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${dados.length}`, 'Content-Length': String(end - start + 1) } });
  }
  return new Response(dados, { headers: { ...headers, 'Content-Length': String(dados.length) } });
}
