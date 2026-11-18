import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { privado } from '@/lib/whatsapp/acesso';

export async function GET(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !['ADMIN', 'USER'].includes(usuario.role)) return Response.json({ erro: 'Acesso não autorizado.' }, { status: 401, headers: privado });
  const params = new URL(request.url).searchParams;
  const busca = (params.get('busca') || '').slice(0, 120);
  const etiqueta = (params.get('etiqueta') || '').slice(0, 100);
  const pagina = Math.max(1, Math.min(10000, Math.floor(Number(params.get('pagina')) || 1)));
  const fila = params.get('fila') || 'meus';
  const scope = fila === 'fila' ? Prisma.sql`c."responsavelId" IS NULL`
    : fila === 'todos' && usuario.role === 'ADMIN' ? Prisma.sql`TRUE` : Prisma.sql`c."responsavelId" = ${usuario.id}`;
  const pattern = '%' + busca.replace(/[\\%_]/g, '\\$&') + '%';
  const search = busca ? Prisma.sql`AND (c.nome ILIKE ${pattern} OR c.telefone LIKE ${pattern})` : Prisma.empty;
  const tag = etiqueta ? Prisma.sql`AND EXISTS (SELECT 1 FROM "ClienteEtiqueta" e WHERE e."clienteId" = c.id AND e."etiquetaId" = ${etiqueta})` : Prisma.empty;
  const clientes = await prisma.$queryRaw<Array<{ id: string; nome: string; telefone: string | null; responsavelId: string | null; naoLida: boolean }>>(Prisma.sql`
    SELECT c.id, c.nome, c.telefone, c."responsavelId",
      (c."versaoEntrada" > COALESCE(l.versao, 0)) AS "naoLida"
    FROM "Cliente" c LEFT JOIN "LeituraConversa" l ON l."clienteId" = c.id AND l."userId" = ${usuario.id}
    WHERE ${scope} ${search} ${tag}
    ORDER BY c."ultimaMensagemEm" DESC NULLS LAST, c.nome, c.id LIMIT 51 OFFSET ${(pagina - 1) * 50}
  `);
  return Response.json({ clientes: clientes.slice(0, 50), temMais: clientes.length > 50 }, { headers: privado });
}
