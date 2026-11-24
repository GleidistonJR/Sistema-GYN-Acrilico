import { Prisma } from '@prisma/client';
import { PERFIS_CHAT_INTERNO, permite } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { mesmaOrigem, privado } from '@/lib/whatsapp/acesso';

type Contexto = { params: Promise<{ id: string }> };
const selecao = { id: true, remetenteId: true, texto: true, criadaEm: true } as const;
const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status, headers: privado });

function inteiro(valor: unknown) {
  const id = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

async function participantes({ params }: Contexto) {
  const usuario = await obterUsuarioSessao();
  if (!usuario?.colaborador || !permite(PERFIS_CHAT_INTERNO, usuario.role)) return null;
  return { eu: usuario.colaborador.id, colega: inteiro((await params).id) };
}

export async function GET(request: Request, contexto: Contexto) {
  const ids = await participantes(contexto);
  if (!ids) return erro('Acesso não autorizado.', 401);
  const { eu, colega } = ids;
  if (!colega || colega === eu) return erro('Conversa inválida.', 400);
  const cursor = new URL(request.url).searchParams.get('antes');
  const antes = inteiro(cursor);
  if (cursor !== null && !antes) return erro('Página inválida.', 400);

  const mensagens = await prisma.mensagemInterna.findMany({
    where: {
      OR: [{ remetenteId: eu, destinatarioId: colega }, { remetenteId: colega, destinatarioId: eu }],
      ...(antes ? { id: { lt: antes } } : {}),
    },
    orderBy: { id: 'desc' },
    take: 51,
    select: selecao,
  });
  return Response.json({ mensagens: mensagens.slice(0, 50).reverse(), anteriores: mensagens.length > 50 }, { headers: privado });
}

export async function POST(request: Request, contexto: Contexto) {
  if (!mesmaOrigem(request)) return erro('Origem inválida.', 403);
  const ids = await participantes(contexto);
  if (!ids) return erro('Acesso não autorizado.', 401);
  const { eu, colega } = ids;
  if (!colega || colega === eu) return erro('Conversa inválida.', 400);
  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === 'string' ? body.texto.replaceAll('\u0000', '').trim() : '';
  if (!texto || texto.length > 4000) return erro('Digite uma mensagem de até 4.000 caracteres.', 400);
  const pedidoId = body?.pedidoId;
  if (typeof pedidoId !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(pedidoId)) {
    return erro('Identificador de envio inválido.', 400);
  }

  const [mensagem] = await prisma.$queryRaw<Array<{
    id: number; remetenteId: number; texto: string; criadaEm: Date;
  }>>`
    INSERT INTO "MensagemInterna" ("remetenteId", "destinatarioId", "pedidoId", texto)
    SELECT ${eu}, c.id, ${pedidoId}::uuid, ${texto}
    FROM "Colaborador" c JOIN "User" u ON u.id = c."userId"
    WHERE c.id = ${colega} AND c."inativadoEm" IS NULL AND u.role IN (${Prisma.join(PERFIS_CHAT_INTERNO)})
    ON CONFLICT ("remetenteId", "pedidoId") DO UPDATE SET "pedidoId" = EXCLUDED."pedidoId"
    WHERE "MensagemInterna"."destinatarioId" = EXCLUDED."destinatarioId" AND "MensagemInterna".texto = EXCLUDED.texto
    RETURNING id, "remetenteId", texto, "criadaEm"
  `;
  if (!mensagem) return erro('Este colega está indisponível.', 404);
  return Response.json(mensagem, { status: 201, headers: privado });
}

export async function PATCH(request: Request, contexto: Contexto) {
  if (!mesmaOrigem(request)) return erro('Origem inválida.', 403);
  const ids = await participantes(contexto);
  if (!ids) return erro('Acesso não autorizado.', 401);
  const { eu, colega } = ids;
  const body = await request.json().catch(() => null);
  const ate = inteiro(body?.ate);
  if (!colega || colega === eu || !ate) return erro('Leitura inválida.', 400);

  await prisma.mensagemInterna.updateMany({
    where: { destinatarioId: eu, remetenteId: colega, id: { lte: ate }, lidaEm: null },
    data: { lidaEm: new Date() },
  });
  return new Response(null, { status: 204, headers: privado });
}
