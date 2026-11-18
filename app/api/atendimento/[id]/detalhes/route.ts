import { prisma } from '@/lib/prisma';
import { acessoConversa, privado } from '@/lib/whatsapp/acesso';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acesso = await acessoConversa(id);
  if (!acesso) return new Response(null, { status: 403 });
  const [etiquetas, selecionadas, vendedores] = await Promise.all([
    prisma.etiqueta.findMany({ orderBy: { nome: 'asc' } }),
    prisma.clienteEtiqueta.findMany({ where: { clienteId: id }, select: { etiquetaId: true } }),
    acesso.usuario.role === 'ADMIN' ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'USER'] } }, select: { id: true, email: true, colaborador: { select: { nome: true } } } }) : [],
  ]);
  return Response.json({ cliente: { id, nome: acesso.cliente.nome, telefone: acesso.cliente.telefone, responsavelId: acesso.cliente.responsavelId }, etiquetas, selecionadas: selecionadas.map(e => e.etiquetaId), vendedores }, { headers: privado });
}
