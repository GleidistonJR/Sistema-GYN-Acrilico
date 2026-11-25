import { contatosChat, identidadeChat } from '@/lib/chat-interno';
import { LIMITE_ANEXO_INTERNO } from '@/lib/chat-interno-midia';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { obterUsuarioSessao } from '@/lib/sessao';
import { mesmaOrigem, privado } from '@/lib/whatsapp/acesso';
import { nomeArquivo, validarMidia } from '@/lib/whatsapp/conteudo.mjs';

type Contexto = { params: Promise<{ id: string }> };
type Mensagem = {
  id: number; remetenteId: string; texto: string; criadaEm: Date;
  anexo: { nome: string; mimeType: string } | null;
  citacao: { id: number; remetenteId: string; texto: string } | null;
};
const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status, headers: privado });
const campos = Prisma.sql`m.id, m."remetenteChave" AS "remetenteId", m.texto, m."criadaEm",
  CASE WHEN m."anexoMime" IS NOT NULL THEN jsonb_build_object('nome', m."anexoNome", 'mimeType', m."anexoMime") END AS anexo,
  CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'remetenteId', c."remetenteChave",
    'texto', COALESCE(NULLIF(LEFT(c.texto, 120), ''), c."anexoNome", 'Mensagem')) END AS citacao`;
const mesmaConversa = (eu: string, colega: string) => Prisma.sql`
  ((m."remetenteChave" = ${eu} AND m."destinatarioChave" = ${colega})
   OR (m."remetenteChave" = ${colega} AND m."destinatarioChave" = ${eu}))`;

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
  const params = new URL(request.url).searchParams;
  if (params.has('arquivo')) {
    const id = inteiro(params.get('arquivo'));
    if (!id) return erro('Arquivo inválido.', 400);
    const [anexo] = await prisma.$queryRaw<Array<{ nome: string; mime: string; dados: Uint8Array }>>`
      SELECT m."anexoNome" AS nome, m."anexoMime" AS mime, m."anexoDados" AS dados
      FROM "MensagemInterna" m WHERE m.id = ${id} AND ${mesmaConversa(eu, colega)} AND m."anexoDados" IS NOT NULL`;
    if (!anexo) return erro('Arquivo indisponível.', 404);
    return responderArquivo(request, anexo, params.has('baixar'));
  }
  if (params.has('alvo')) {
    const alvo = inteiro(params.get('alvo'));
    if (!alvo) return erro('Mensagem inválida.', 400);
    const [original] = await prisma.$queryRaw<Mensagem[]>`
      SELECT ${campos} FROM "MensagemInterna" m LEFT JOIN "MensagemInterna" c ON c.id = m."citacaoId"
      WHERE m.id = ${alvo} AND ${mesmaConversa(eu, colega)}`;
    if (!original) return erro('A mensagem original não está disponível nesta conversa.', 404);
    const [anteriores, posteriores] = await Promise.all([
      prisma.$queryRaw<Mensagem[]>`SELECT ${campos} FROM "MensagemInterna" m LEFT JOIN "MensagemInterna" c ON c.id = m."citacaoId"
        WHERE m.id < ${alvo} AND ${mesmaConversa(eu, colega)} ORDER BY m.id DESC LIMIT 20`,
      prisma.$queryRaw<Mensagem[]>`SELECT ${campos} FROM "MensagemInterna" m LEFT JOIN "MensagemInterna" c ON c.id = m."citacaoId"
        WHERE m.id > ${alvo} AND ${mesmaConversa(eu, colega)} ORDER BY m.id LIMIT 20`,
    ]);
    return Response.json({ mensagens: [...anteriores.reverse(), original, ...posteriores] }, { headers: privado });
  }
  const cursor = params.get('antes');
  const antes = inteiro(cursor);
  if (cursor !== null && !antes) return erro('Página inválida.', 400);

  const mensagens = await prisma.$queryRaw<Mensagem[]>`
    SELECT ${campos} FROM "MensagemInterna" m LEFT JOIN "MensagemInterna" c ON c.id = m."citacaoId"
    WHERE ${mesmaConversa(eu, colega)} AND (${antes}::int IS NULL OR m.id < ${antes}::int)
    ORDER BY m.id DESC
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
  let body;
  try { body = await lerEnvio(request); }
  catch { return erro('Envio inválido. O arquivo deve ter até 4 MB.', 400); }
  const texto = typeof body?.texto === 'string' ? body.texto.replaceAll('\u0000', '').trim() : '';
  const arquivo = body?.arquivo instanceof File ? body.arquivo : null;
  if ((!texto && !arquivo) || texto.length > 4000) return erro('Digite uma mensagem de até 4.000 caracteres ou escolha um arquivo.', 400);
  if (arquivo && (!arquivo.size || arquivo.size > LIMITE_ANEXO_INTERNO)) return erro('O arquivo deve ter até 4 MB.', 400);
  const dados = arquivo ? Buffer.from(await arquivo.arrayBuffer()) : null;
  let mime: string | null = null;
  if (dados && arquivo) {
    try { mime = validarMidia(dados, arquivo.type); }
    catch { return erro('Envie uma imagem, um vídeo, um áudio ou um PDF válido.', 400); }
  }
  const nome = arquivo ? nomeArquivo(arquivo.name) : null;
  const citacao = inteiro(body?.citacaoId);
  if (body?.citacaoId != null && !citacao) return erro('Mensagem citada inválida.', 400);
  const pedidoId = body?.pedidoId;
  if (typeof pedidoId !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(pedidoId)) {
    return erro('Identificador de envio inválido.', 400);
  }

  const [mensagem] = await prisma.$queryRaw<Mensagem[]>`
    WITH contatos AS (${contatosChat}), original AS (
      SELECT m.id, m."remetenteChave", m.texto, m."anexoNome" FROM "MensagemInterna" m
      WHERE m.id = ${citacao}::int AND ${mesmaConversa(eu, colega)}
    ), gravada AS (
      INSERT INTO "MensagemInterna" ("remetenteId", "destinatarioId", "remetenteAvulsoId", "destinatarioAvulsoId",
        "pedidoId", texto, "citacaoId", "anexoNome", "anexoMime", "anexoDados")
      SELECT r."colaboradorId", d."colaboradorId", r."avulsoId", d."avulsoId", ${pedidoId}::uuid, ${texto},
        (SELECT id FROM original), ${nome}, ${mime}, ${dados}::bytea
      FROM contatos r CROSS JOIN contatos d
      WHERE r.id = ${eu} AND d.id = ${colega} AND r.disponivel AND d.disponivel
        AND (${citacao}::int IS NULL OR EXISTS (SELECT 1 FROM original))
      ON CONFLICT ("remetenteChave", "pedidoId") DO UPDATE SET "pedidoId" = EXCLUDED."pedidoId"
      WHERE "MensagemInterna"."destinatarioChave" = EXCLUDED."destinatarioChave" AND "MensagemInterna".texto = EXCLUDED.texto
        AND "MensagemInterna"."citacaoId" IS NOT DISTINCT FROM EXCLUDED."citacaoId"
        AND "MensagemInterna"."anexoNome" IS NOT DISTINCT FROM EXCLUDED."anexoNome"
        AND "MensagemInterna"."anexoMime" IS NOT DISTINCT FROM EXCLUDED."anexoMime"
        AND "MensagemInterna"."anexoDados" IS NOT DISTINCT FROM EXCLUDED."anexoDados"
      RETURNING id, "remetenteChave", texto, "criadaEm", "citacaoId", "anexoNome", "anexoMime"
    )
    SELECT ${campos} FROM gravada m LEFT JOIN original c ON c.id = m."citacaoId"
  `;
  if (!mensagem) return erro('Não foi possível enviar. Confira se o colega e a mensagem citada estão disponíveis.', 404);
  return Response.json(mensagem, { status: 201, headers: privado });
}

async function lerEnvio(request: Request) {
  const limite = LIMITE_ANEXO_INTERNO + 32 * 1024;
  if (Number(request.headers.get('content-length')) > limite || !request.body) throw new Error();
  const leitor = request.body.getReader();
  const partes = [];
  let tamanho = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    tamanho += value.byteLength;
    if (tamanho > limite) { await leitor.cancel(); throw new Error(); }
    partes.push(value);
  }
  const tipo = request.headers.get('content-type') ?? '';
  const corpo = new Response(Buffer.concat(partes), { headers: { 'Content-Type': tipo } });
  return tipo.startsWith('multipart/form-data') ? Object.fromEntries(await corpo.formData()) : await corpo.json();
}

function responderArquivo(request: Request, anexo: { nome: string; mime: string; dados: Uint8Array }, baixar: boolean) {
  const headers = new Headers(privado);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Type', anexo.mime);
  headers.set('Accept-Ranges', 'bytes');
  const nome = encodeURIComponent(anexo.nome.toWellFormed()).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));
  headers.set('Content-Disposition', `${baixar || anexo.mime === 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${nome}`);
  const dados = new Uint8Array(anexo.dados);
  const tamanho = dados.byteLength;
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const inicio = !match ? -1 : match[1] ? Number(match[1]) : Math.max(0, tamanho - Number(match[2]));
    const fim = match?.[1] && match[2] ? Math.min(tamanho - 1, Number(match[2])) : tamanho - 1;
    if (inicio < 0 || inicio > fim) {
      headers.set('Content-Range', `bytes */${tamanho}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set('Content-Range', `bytes ${inicio}-${fim}/${tamanho}`);
    headers.set('Content-Length', String(fim - inicio + 1));
    return new Response(dados.subarray(inicio, fim + 1), { status: 206, headers });
  }
  headers.set('Content-Length', String(tamanho));
  return new Response(dados, { headers });
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
