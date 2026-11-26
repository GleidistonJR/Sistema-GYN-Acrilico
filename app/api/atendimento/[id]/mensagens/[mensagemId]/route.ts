import { prisma } from '@/lib/prisma';
import { acessoConversa, mesmaOrigem, privado } from '@/lib/whatsapp/acesso';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; mensagemId: string }> }) {
  const { id, mensagemId } = await params;
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: privado });
  if (!mesmaOrigem(request)) return json({ erro: 'Acesso não autorizado.' }, 403);
  const acesso = await acessoConversa(id);
  if (!acesso) return json({ erro: 'Acesso não autorizado.' }, 403);

  const mensagem = await prisma.mensagemWhatsApp.findFirst({
    where: { id: mensagemId, clienteId: id, direcao: 'SAIDA', externaId: { not: null } },
    select: { id: true, autorId: true, status: true },
  });
  if (!mensagem) return json({ erro: 'Mensagem enviada não encontrada.' }, 404);
  if (mensagem.autorId !== acesso.usuario.id && acesso.usuario.role !== 'ADMIN') {
    return json({ erro: 'Você só pode apagar as mensagens que enviou.' }, 403);
  }
  if (mensagem.status === 'APAGADA') return json({ ok: true });
  if (!['ENVIADA', 'ENTREGUE', 'LIDA'].includes(mensagem.status)) {
    return json({ erro: 'Aguarde a confirmação do envio pelo WhatsApp.' }, 409);
  }
  const token = process.env.WHATSAPP_BRIDGE_TOKEN;
  if (!token) return json({ erro: 'Serviço do WhatsApp indisponível.' }, 503);

  try {
    const resposta = await fetch(`${process.env.WHATSAPP_BRIDGE_URL || 'http://127.0.0.1:3001'}/revogar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mensagem.id }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (resposta.ok) return json({ ok: true });
    if (resposta.status === 409) return json({ erro: 'O WhatsApp não permite mais apagar esta mensagem para todos.' }, 409);
  } catch { /* An in-flight request may still be confirmed by the worker. */ }
  return json({ erro: 'Não foi possível confirmar a exclusão pelo WhatsApp. Confira a conversa antes de tentar novamente.' }, 503);
}
