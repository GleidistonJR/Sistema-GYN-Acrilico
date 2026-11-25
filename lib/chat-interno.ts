import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ehPerfilAvulso, PERFIS_AVULSOS, PERFIS_CHAT_PESSOAL, permite } from '@/lib/permissoes';

export function identidadeChat(usuario: { id: string; role: string; colaborador: { id: number } | null }) {
  if (usuario.colaborador && permite(PERFIS_CHAT_PESSOAL, usuario.role)) return String(usuario.colaborador.id);
  if (!usuario.colaborador && ehPerfilAvulso(usuario.role)) return 'avulso-' + usuario.id;
  return null;
}

// Colaboradores mantêm a mesma identidade ao trocar o login.
// Uma conta avulsa revogada fica indisponível, mas preserva o histórico dos destinatários.
export const contatosChat = Prisma.sql`
  SELECT c.id::text AS id, c.id AS "colaboradorId", NULL::text AS "avulsoId", c.nome,
    NULL::text AS perfil, (c."inativadoEm" IS NULL AND COALESCE(u.role IN (${Prisma.join(PERFIS_CHAT_PESSOAL)}), false)) AS disponivel
  FROM "Colaborador" c LEFT JOIN "User" u ON u.id = c."userId"
  UNION ALL
  SELECT 'avulso-' || u.id, NULL::int, u.id, COALESCE(NULLIF(u.apelido, ''), u.email), u.role, true
  FROM "User" u
  WHERE u.role IN (${Prisma.join(PERFIS_AVULSOS)})
    AND NOT EXISTS (SELECT 1 FROM "Colaborador" c WHERE c."userId" = u.id)
`;

export async function listarColegas(eu: string) {
  return prisma.$queryRaw<Array<{ id: string; nome: string; disponivel: boolean; perfil: string | null }>>`
    WITH contatos AS (${contatosChat}), historico AS (
      SELECT "destinatarioChave" AS id FROM "MensagemInterna" WHERE "remetenteChave" = ${eu}
      UNION
      SELECT "remetenteChave" AS id FROM "MensagemInterna" WHERE "destinatarioChave" = ${eu}
    )
    SELECT COALESCE(c.id, h.id) AS id, COALESCE(c.nome, 'Acesso avulso revogado') AS nome,
      COALESCE(c.disponivel, false) AS disponivel, c.perfil
    FROM contatos c FULL JOIN historico h ON c.id = h.id
    WHERE COALESCE(c.id, h.id) <> ${eu} AND (c.disponivel OR h.id IS NOT NULL)
    ORDER BY nome, id
  `;
}

export async function avisosChatInterno(eu: string) {
  return prisma.$queryRaw<Array<{
    colegaId: string; nome: string; mensagemId: number; recebidaEm: Date; previa: string;
  }>>`
    WITH pendentes AS (
      SELECT DISTINCT ON ("remetenteChave") id, "remetenteChave", "criadaEm", texto, "anexoMime"
      FROM "MensagemInterna"
      WHERE "destinatarioChave" = ${eu} AND "lidaEm" IS NULL
      ORDER BY "remetenteChave", id DESC
    )
    SELECT m."remetenteChave" AS "colegaId", COALESCE(c.nome, 'Acesso avulso revogado') AS nome,
      m.id AS "mensagemId", m."criadaEm" AS "recebidaEm",
      COALESCE(NULLIF(LEFT(BTRIM(REGEXP_REPLACE(m.texto, '[[:space:]]+', ' ', 'g')), 120), ''),
        CASE WHEN m."anexoMime" LIKE 'audio/%' THEN 'Enviou um áudio.'
          WHEN m."anexoMime" LIKE 'image/%' THEN 'Enviou uma foto.'
          WHEN m."anexoMime" LIKE 'video/%' THEN 'Enviou um vídeo.'
          ELSE 'Enviou um arquivo.' END) AS previa
    FROM pendentes m LEFT JOIN (${contatosChat}) c ON c.id = m."remetenteChave"
  `;
}
