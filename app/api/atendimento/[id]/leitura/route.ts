import { prisma } from '@/lib/prisma';
import { acessoConversa, mesmaOrigem, privado } from '@/lib/whatsapp/acesso';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!mesmaOrigem(request)) return new Response(null, { status: 403 });
  const { id } = await params;
  const acesso = await acessoConversa(id);
  if (!acesso) return new Response(null, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.versao !== 'string' || !/^\d{1,19}$/.test(body.versao)) return new Response(null, { status: 400 });
  const versao = BigInt(body.versao);
  if (versao > acesso.cliente.versaoEntrada) return new Response(null, { status: 400 });
  // Never mark future arrivals as read and never move the user's cursor backwards.
  await prisma.$executeRaw`INSERT INTO "LeituraConversa" ("userId", "clienteId", versao)
    VALUES (${acesso.usuario.id}, ${id}, ${versao})
    ON CONFLICT ("userId", "clienteId") DO UPDATE SET versao = EXCLUDED.versao
    WHERE "LeituraConversa".versao < EXCLUDED.versao`;
  return Response.json({ ok: true }, { headers: privado });
}
