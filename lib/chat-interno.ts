import 'server-only';
import { prisma } from '@/lib/prisma';
import { PERFIS_CHAT_INTERNO } from '@/lib/permissoes';

export async function listarColegas(eu: number) {
  const colegas = await prisma.colaborador.findMany({
    where: {
      id: { not: eu },
      OR: [
        { inativadoEm: null, user: { role: { in: [...PERFIS_CHAT_INTERNO] } } },
        { mensagensInternasEnviadas: { some: { destinatarioId: eu } } },
        { mensagensInternasRecebidas: { some: { remetenteId: eu } } },
      ],
    },
    orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    select: { id: true, nome: true, inativadoEm: true, user: { select: { role: true } } },
  });
  return colegas.map(({ id, nome, inativadoEm, user }) => ({
    id, nome, disponivel: !inativadoEm && !!user && PERFIS_CHAT_INTERNO.some(role => role === user.role),
  }));
}

export async function avisosChatInterno(eu: number) {
  return prisma.$queryRaw<Array<{
    colegaId: number; nome: string; mensagemId: number; recebidaEm: Date; previa: string;
  }>>`
    SELECT DISTINCT ON (m."remetenteId") m."remetenteId" AS "colegaId", c.nome,
      m.id AS "mensagemId", m."criadaEm" AS "recebidaEm",
      LEFT(BTRIM(REGEXP_REPLACE(m.texto, '[[:space:]]+', ' ', 'g')), 120) AS previa
    FROM "MensagemInterna" m JOIN "Colaborador" c ON c.id = m."remetenteId"
    WHERE m."destinatarioId" = ${eu} AND m."lidaEm" IS NULL
    ORDER BY m."remetenteId", m.id DESC
  `;
}
