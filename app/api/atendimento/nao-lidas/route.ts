import { permite, PERFIS_ATENDIMENTO } from '@/lib/permissoes';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { privado } from '@/lib/whatsapp/acesso';
import { tiposAvisoInternoWhatsApp } from '@/lib/whatsapp/conteudo.mjs';

const limitePrevia = 120;
const previaAnexo: Partial<Record<string, string>> = {
  image: 'Enviou uma foto.',
  video: 'Enviou um vídeo.',
  audio: 'Enviou um áudio.',
  ptt: 'Enviou uma mensagem de voz.',
  document: 'Enviou um documento.',
  sticker: 'Enviou uma figurinha.',
};

export async function GET() {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !permite(PERFIS_ATENDIMENTO, usuario.role)) {
    return new Response(null, { status: 401, headers: privado });
  }

  const conversas = await prisma.$queryRaw<Array<{
    clienteId: string; nomeCliente: string; mensagemId: string | null;
    recebidaEm: Date | null; texto: string | null; tipo: string | null;
  }>>`
    SELECT c.id AS "clienteId", c.nome AS "nomeCliente",
      m.id AS "mensagemId", m."createdAt" AS "recebidaEm", m.tipo,
      LEFT(BTRIM(REGEXP_REPLACE(m.texto, '[[:space:]]+', ' ', 'g')), ${limitePrevia + 1}::int) AS texto
    FROM "Cliente" c
    LEFT JOIN "LeituraConversa" l ON l."clienteId" = c.id AND l."userId" = ${usuario.id}
    LEFT JOIN LATERAL (
      SELECT id, "createdAt", tipo, texto
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
  const pendentes = conversas.map(({ texto, tipo, ...conversa }) => {
    const caracteres = Array.from(texto ?? '');
    const previa = caracteres.length > limitePrevia
      ? caracteres.slice(0, limitePrevia).join('').trimEnd() + '…'
      : texto || previaAnexo[tipo ?? ''] || 'Enviou uma mensagem.';
    return { ...conversa, previa };
  });
  return Response.json({ total: pendentes.length, conversas: pendentes }, { headers: privado });
}
