import { obterUsuarioSessao } from '@/lib/sessao';
import { chamarWhatsApp } from '@/lib/whatsapp/bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const usuario = await obterUsuarioSessao();
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!usuario) return Response.json({ erro: 'Faça login.' }, { status: 401, headers });
  if (usuario.role !== 'ADMIN') return Response.json({ erro: 'Acesso restrito ao administrador.' }, { status: 403, headers });
  try {
    return Response.json(await chamarWhatsApp('status'), { headers });
  } catch {
    return Response.json({ status: 'indisponivel', qr: null, numero: null,
      mensagem: 'O serviço do WhatsApp está indisponível. Confira se o computador da empresa está ligado e com internet, depois tente reconectar.', atualizadoEm: new Date().toISOString(),
    }, { status: 503, headers });
  }
}
