import { acessoConversa, mesmaOrigem, privado } from '@/lib/whatsapp/acesso';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mesmaOrigem(request) || !await acessoConversa(id)) return Response.json({ erro: 'Acesso não autorizado.' }, { status: 403, headers: privado });
  try {
    const resposta = await fetch(`${process.env.WHATSAPP_BRIDGE_URL || 'http://127.0.0.1:3001'}/sync`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.WHATSAPP_BRIDGE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId: id }), signal: AbortSignal.timeout(5000), cache: 'no-store', redirect: 'error',
    });
    if (!resposta.ok) throw new Error();
    return Response.json({ ok: true }, { status: 202, headers: privado });
  } catch { return Response.json({ erro: 'Não foi possível sincronizar. Confira a conexão do WhatsApp.' }, { status: 503, headers: privado }); }
}
