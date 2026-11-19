import { PERFIS_ATENDIMENTO } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';
import { acessoConversa, privado } from '@/lib/whatsapp/acesso';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acesso = await acessoConversa(id);
  if (!acesso) return new Response(null, { status: 403 });
  const cliente = { id, nome: acesso.cliente.nome, telefone: acesso.cliente.telefone, responsavelId: acesso.cliente.responsavelId };
  if (new URL(request.url).searchParams.has('resumo')) return Response.json({ cliente }, { headers: privado });
  const [etiquetas, selecionadas, usuarios] = await Promise.all([
    prisma.etiqueta.findMany({ orderBy: { nome: 'asc' } }),
    prisma.clienteEtiqueta.findMany({ where: { clienteId: id }, select: { etiquetaId: true } }),
    prisma.user.findMany({
      where: { role: { in: [...PERFIS_ATENDIMENTO] } },
      select: { id: true, role: true, apelido: true, email: true, colaborador: { select: { nome: true } } },
    }),
  ]);
  const operadores = usuarios.map(u => ({ id: u.id, nome: u.colaborador?.nome || u.apelido || (u.role === 'RECEPCAO' ? 'Recepção' : u.email) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return Response.json({ cliente, etiquetas, selecionadas: selecionadas.map(e => e.etiquetaId), operadores }, { headers: privado });
}
