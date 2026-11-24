import { contatosChat, identidadeChat } from '@/lib/chat-interno';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { mesmaOrigem, privado } from '@/lib/whatsapp/acesso';

type Contexto = { params: Promise<{ id: string }> };
type Mensagem = { id: number; remetenteId: string; texto: string; criadaEm: Date };
const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status, headers: privado });

function inteiro(valor: unknown) {
  const id = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

async function participantes({ params }: Contexto) {
  const usuario = await obterUsuarioSessao();
  const eu = usuario && identidadeChat(usuario);
  if (!eu) return null;
  const { id } = await params;
  const pessoal = inteiro(id);
  const colega = pessoal ? String(pessoal) : /^avulso-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id) ? id : null;
  return { eu, colega };
}

export async function GET(request: Request, contexto: Contexto) {
  const ids = await participantes(contexto);
  if (!ids) return erro('Acesso não autorizado.', 401);
  const { eu, colega } = ids;
  if (!colega || colega === eu) return erro('Conversa inválida.', 400);
  const cursor = new URL(request.url).searchParams.get('antes');
  const antes = inteiro(cursor);
  if (cursor !== null && !antes) return erro('Página inválida.', 400);

  const mensagens = await prisma.$queryRaw<Mensagem[]>`
    SELECT id, "remetenteChave" AS "remetenteId", texto, "criadaEm"
    FROM "MensagemInterna"
    WHERE (("remetenteChave" = ${eu} AND "destinatarioChave" = ${colega})
        OR ("remetenteChave" = ${colega} AND "destinatarioChave" = ${eu}))
      AND (${antes}::int IS NULL OR id < ${antes}::int)
    ORDER BY id DESC
    LIMIT 51
  `;
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

  const [mensagem] = await prisma.$queryRaw<Mensagem[]>`
    WITH contatos AS (${contatosChat})
    INSERT INTO "MensagemInterna" ("remetenteId", "destinatarioId", "remetenteAvulsoId", "destinatarioAvulsoId", "pedidoId", texto)
    SELECT r."colaboradorId", d."colaboradorId", r."avulsoId", d."avulsoId", ${pedidoId}::uuid, ${texto}
    FROM contatos r CROSS JOIN contatos d
    WHERE r.id = ${eu} AND d.id = ${colega} AND r.disponivel AND d.disponivel
    ON CONFLICT ("remetenteChave", "pedidoId") DO UPDATE SET "pedidoId" = EXCLUDED."pedidoId"
    WHERE "MensagemInterna"."destinatarioChave" = EXCLUDED."destinatarioChave" AND "MensagemInterna".texto = EXCLUDED.texto
    RETURNING id, "remetenteChave" AS "remetenteId", texto, "criadaEm"
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

  await prisma.$executeRaw`
    UPDATE "MensagemInterna" SET "lidaEm" = CURRENT_TIMESTAMP
    WHERE "destinatarioChave" = ${eu} AND "remetenteChave" = ${colega} AND id <= ${ate} AND "lidaEm" IS NULL
  `;
  return new Response(null, { status: 204, headers: privado });
}
