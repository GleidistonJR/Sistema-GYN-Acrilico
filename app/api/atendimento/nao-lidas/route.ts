import { permite, PERFIS_ATENDIMENTO } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { privado } from '@/lib/whatsapp/acesso';

export async function GET() {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !permite(PERFIS_ATENDIMENTO, usuario.role)) {
    return new Response(null, { status: 401, headers: privado });
  }

  const [{ total }] = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COUNT(*)::int AS total
    FROM "Cliente" c
    LEFT JOIN "LeituraConversa" l ON l."clienteId" = c.id AND l."userId" = ${usuario.id}
    WHERE c."responsavelId" = ${usuario.id}
      AND c."ultimaMensagemEm" IS NOT NULL
      AND c."versaoEntrada" > GREATEST(COALESCE(l.versao, 0), c."versaoEntradaExcluida")
  `;
  return Response.json({ total }, { headers: privado });
}
