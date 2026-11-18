import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { mesmaOrigem, privado } from '@/lib/whatsapp/acesso';

export async function POST(request: Request) {
  if (!mesmaOrigem(request)) return new Response(null, { status: 403 });
  const usuario = await obterUsuarioSessao();
  if (!usuario || !['ADMIN', 'USER'].includes(usuario.role)) return new Response(null, { status: 401 });
  const body = await request.text();
  if (body.length > 6000) return new Response(null, { status: 400 });
  let ids: unknown;
  try { ids = JSON.parse(body).ids; } catch { return new Response(null, { status: 400 }); }
  if (!Array.isArray(ids) || !ids.length || ids.length > 50 || ids.some(id => typeof id !== 'string' || id.length > 100)) return new Response(null, { status: 400 });
  const scope = usuario.role === 'ADMIN' ? Prisma.sql`TRUE` : Prisma.sql`(c."responsavelId" = ${usuario.id} OR c."responsavelId" IS NULL)`;
  // No WhatsApp network call here. The worker consumes only expired/requested entries.
  const fotos = await prisma.$transaction(async tx => {
    const changed = await tx.$executeRaw(Prisma.sql`
      INSERT INTO "FotoContato" ("clienteId") SELECT c.id FROM "Cliente" c
      WHERE c.id IN (${Prisma.join(ids as string[])}) AND ${scope} AND c.telefone IS NOT NULL
      ON CONFLICT ("clienteId") DO UPDATE SET pendente = TRUE
      WHERE NOT "FotoContato".pendente AND "FotoContato"."consultadaEm" < NOW() - INTERVAL '24 hours'
    `);
    if (changed) await tx.$queryRaw`SELECT pg_notify('whatsapp_fotos', '')::text`;
    return tx.$queryRaw<Array<{ id: string; url: string | null; pendente: boolean }>>(Prisma.sql`
      SELECT c.id, f.url, COALESCE(f.pendente, FALSE) AS pendente FROM "Cliente" c
      LEFT JOIN "FotoContato" f ON f."clienteId" = c.id
      WHERE c.id IN (${Prisma.join(ids as string[])}) AND ${scope}
    `);
  });
  return Response.json({ fotos }, { headers: privado });
}
