import { permite, PERFIS_ATENDIMENTO } from '@/lib/permissoes';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { privado } from '@/lib/whatsapp/acesso';
import { tiposAvisoInternoWhatsApp } from '@/lib/whatsapp/conteudo.mjs';

export async function GET() {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !permite(PERFIS_ATENDIMENTO, usuario.role)) {
    return new Response(null, { status: 401, headers: privado });
  }

  const conversas = await prisma.$queryRaw<Array<{
    clienteId: string; mensagemId: string | null; recebidaEm: Date | null;
  }>>`
    SELECT c.id AS "clienteId", m.id AS "mensagemId", m."createdAt" AS "recebidaEm"
    FROM "Cliente" c
    LEFT JOIN "LeituraConversa" l ON l."clienteId" = c.id AND l."userId" = ${usuario.id}
    LEFT JOIN LATERAL (
      SELECT id, "createdAt"
      FROM "MensagemWhatsApp"
      WHERE "clienteId" = c.id AND direcao = 'ENTRADA'
        AND tipo NOT IN (${Prisma.join(tiposAvisoInternoWhatsApp)})
      ORDER BY "enviadoEm" DESC, id DESC
      LIMIT 1
    ) m ON true
    WHERE c."responsavelId" = ${usuario.id}
      AND c."ultimaMensagemEm" IS NOT NULL
      AND c."versaoEntrada" > GREATEST(COALESCE(l.versao, 0), c."versaoEntradaExcluida")
  `;
  return Response.json({ total: conversas.length, conversas }, { headers: privado });
}
