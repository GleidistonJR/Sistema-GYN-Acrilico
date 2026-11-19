import { permite, PERFIS_ATENDIMENTO } from '@/lib/permissoes';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { privado } from '@/lib/whatsapp/acesso';

export async function GET(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !permite(PERFIS_ATENDIMENTO, usuario.role)) return Response.json({ erro: 'Acesso não autorizado.' }, { status: 401, headers: privado });
  const params = new URL(request.url).searchParams;
  const busca = (params.get('busca') || '').slice(0, 120);
  const etiqueta = (params.get('etiqueta') || '').slice(0, 100);
  const pagina = Math.max(1, Math.min(10000, Math.floor(Number(params.get('pagina')) || 1)));
  const fila = params.get('fila') || 'meus';
  const scope = fila === 'fila' ? Prisma.sql`c."responsavelId" IS NULL`
    : fila === 'todos' ? Prisma.sql`TRUE` : Prisma.sql`c."responsavelId" = ${usuario.id}`;
  const pattern = '%' + busca.replace(/[\\%_]/g, '\\$&') + '%';
  const search = busca ? Prisma.sql`AND (c.nome ILIKE ${pattern} OR c.telefone LIKE ${pattern})` : Prisma.empty;
  const tag = etiqueta ? Prisma.sql`AND EXISTS (SELECT 1 FROM "ClienteEtiqueta" e WHERE e."clienteId" = c.id AND e."etiquetaId" = ${etiqueta})` : Prisma.empty;
  const [clientes, etiquetas] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; nome: string; telefone: string | null; responsavelId: string | null; naoLida: boolean; responsavelNome: string | null }>>(Prisma.sql`
    SELECT c.id, c.nome, c.telefone, c."responsavelId",
      COALESCE(NULLIF(u.apelido, ''), co.nome, CASE WHEN u.role = 'RECEPCAO' THEN 'Recepção' END, u.email) AS "responsavelNome",
      (c."versaoEntrada" > GREATEST(COALESCE(l.versao, 0), c."versaoEntradaExcluida")) AS "naoLida"
    FROM "Cliente" c LEFT JOIN "LeituraConversa" l ON l."clienteId" = c.id AND l."userId" = ${usuario.id}
    LEFT JOIN "User" u ON u.id = c."responsavelId"
    LEFT JOIN "Colaborador" co ON co."userId" = u.id
    WHERE (c."conversaExcluidaEm" IS NULL OR c."ultimaMensagemEm" IS NOT NULL) AND ${scope} ${search} ${tag}
    ORDER BY c."ultimaMensagemEm" DESC NULLS LAST, c.nome, c.id LIMIT 51 OFFSET ${(pagina - 1) * 50}
    `),
    prisma.etiqueta.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
  ]);
  return Response.json({ clientes: clientes.slice(0, 50), temMais: clientes.length > 50, etiquetas }, { headers: privado });
}
