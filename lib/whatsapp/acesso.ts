import 'server-only';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';

export async function acessoConversa(clienteId: string, escrita = false) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !['ADMIN', 'USER'].includes(usuario.role)) return null;
  const cliente = await prisma.cliente.findFirst({ where: {
    id: clienteId,
    ...(usuario.role === 'ADMIN' ? {} : escrita ? { responsavelId: usuario.id } : { OR: [{ responsavelId: usuario.id }, { responsavelId: null }] }),
  } });
  return cliente ? { usuario, cliente } : null;
}

export const privado = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export function mesmaOrigem(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && url.host === (request.headers.get('host') || new URL(request.url).host);
  } catch { return false; }
}
