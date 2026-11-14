import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !['ADMIN', 'USER'].includes(usuario.role)) {
    return new Response(null, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id } = await params;
  const foto = await prisma.fotoItem.findUnique({ where: { id } });
  if (!foto) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(foto.dados), {
    headers: {
      'Content-Type': foto.mimeType,
      'Content-Length': String(foto.dados.length),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
