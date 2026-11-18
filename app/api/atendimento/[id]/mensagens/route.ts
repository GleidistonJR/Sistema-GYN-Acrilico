import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { acessoConversa, mesmaOrigem, privado } from '@/lib/whatsapp/acesso';
import { chamarWhatsApp } from '@/lib/whatsapp/bridge';
import { LIMITE_MIDIA, nomeArquivo, validarMidia } from '@/lib/whatsapp/conteudo.mjs';

export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: privado });
const selecao = { id: true, externaId: true, citacao: true, texto: true, tipo: true, direcao: true, status: true, erro: true, enviadoEm: true,
  autor: { select: { colaborador: { select: { nome: true } } } },
  midia: { select: { nome: true, mimeType: true } },
} satisfies Prisma.MensagemWhatsAppSelect;

export async function GET(request: Request, { params }: Contexto) {
  const { id } = await params;
  const acesso = await acessoConversa(id);
  if (!acesso) return json({ erro: 'Conversa não disponível para este usuário.' }, 403);
  const citadaPor = new URL(request.url).searchParams.get('citadaPor');
  if (citadaPor) {
    const resposta = await prisma.mensagemWhatsApp.findFirst({ where: { id: citadaPor, clienteId: id }, select: { conta: true, citacao: true } });
    const citacao = resposta?.citacao as { externaId?: string } | null;
    const alvo = citacao?.externaId ? await prisma.mensagemWhatsApp.findFirst({ where: { clienteId: id, conta: resposta!.conta, externaId: citacao.externaId }, select: selecao }) : null;
    if (!alvo) return json({ erro: 'A mensagem original não está disponível no histórico do sistema.' }, 404);
    const [anteriores, posteriores] = await Promise.all([
      prisma.mensagemWhatsApp.findMany({ where: { clienteId: id, OR: [{ enviadoEm: { lt: alvo.enviadoEm } }, { enviadoEm: alvo.enviadoEm, id: { lt: alvo.id } }] }, orderBy: [{ enviadoEm: 'desc' }, { id: 'desc' }], take: 20, select: selecao }),
      prisma.mensagemWhatsApp.findMany({ where: { clienteId: id, OR: [{ enviadoEm: { gt: alvo.enviadoEm } }, { enviadoEm: alvo.enviadoEm, id: { gt: alvo.id } }] }, orderBy: [{ enviadoEm: 'asc' }, { id: 'asc' }], take: 20, select: selecao }),
    ]);
    return json({ alvoId: alvo.id, mensagens: [...anteriores.reverse(), alvo, ...posteriores] });
  }
  const antes = new URL(request.url).searchParams.get('antes');
  const podeEnviar = true; // Todos os operadores com acesso podem responder, inclusive na fila.
  if (!antes && new URL(request.url).searchParams.get('versao') === acesso.cliente.versaoMensagens.toString()) {
    return new Response(null, { status: 304, headers: { ...privado, 'X-Pode-Enviar': String(podeEnviar) } });
  }
  const cursor = antes ? await prisma.mensagemWhatsApp.findFirst({ where: { id: antes, clienteId: id }, select: { id: true, enviadoEm: true } }) : null;
  if (antes && !cursor) return json({ erro: 'Página inválida.' }, 400);
  const mensagens = await prisma.mensagemWhatsApp.findMany({ where: { clienteId: id,
    ...(cursor ? { OR: [{ enviadoEm: { lt: cursor.enviadoEm } }, { enviadoEm: cursor.enviadoEm, id: { lt: cursor.id } }] } : {}),
  }, orderBy: [{ enviadoEm: 'desc' }, { id: 'desc' }], take: 101, select: selecao });
  return json({ mensagens: mensagens.slice(0, 100).reverse(), temAnteriores: mensagens.length > 100,
    podeEnviar, versaoEntrada: acesso.cliente.versaoEntrada.toString(), versaoMensagens: acesso.cliente.versaoMensagens.toString(),
  });
}

export async function POST(request: Request, { params }: Contexto) {
  if (!mesmaOrigem(request)) return json({ erro: 'Origem inválida.' }, 403);
  const { id } = await params;
  const acesso = await acessoConversa(id);
  if (!acesso) return json({ erro: 'Conversa não disponível para este usuário.' }, 403);
  try {
    // Enforce the limit while reading, including chunked requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ erro: 'Mensagem vazia.' }, 400);
    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > LIMITE_MIDIA + 65536) { await reader.cancel(); return json({ erro: 'O arquivo deve ter até 10 MB.' }, 413); }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    const form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || '' }, body }).formData();
    const texto = String(form.get('texto') || '').trim();
    const pedidoId = String(form.get('pedidoId') || '');
    if (!/^[a-f0-9-]{36}$/i.test(pedidoId) || texto.length > 6000) return json({ erro: 'Mensagem inválida ou acima de 6.000 caracteres.' }, 400);
    const arquivo = form.get('arquivo');
    const voz = form.get('voz') === 'true';
    const responderId = String(form.get('responderId') || '');
    if (responderId.length > 100) return json({ erro: 'Mensagem citada inválida.' }, 400);
    let midia: { dados: Buffer; nome: string; mimeType: string } | undefined;
    if (arquivo instanceof File && arquivo.size) {
      const dados = Buffer.from(await arquivo.arrayBuffer());
      midia = { dados, nome: nomeArquivo(arquivo.name), mimeType: validarMidia(dados, arquivo.type) };
    }
    if (!texto && !midia) return json({ erro: 'Digite uma mensagem ou selecione um arquivo.' }, 400);
    if (voz && !midia?.mimeType.startsWith('audio/')) return json({ erro: 'A mensagem de voz precisa de um arquivo de áudio.' }, 400);
    const conteudoHash = createHash('sha256').update(JSON.stringify([texto, midia?.nome, midia?.mimeType])).update(midia?.dados ?? '').update(voz ? ':voz' : '').update(responderId ? ':resposta:' + responderId : '').digest('hex');
    const existing = await prisma.mensagemWhatsApp.findUnique({ where: { pedidoId } });
    if (existing) {
      if (existing.clienteId !== id || existing.autorId !== acesso.usuario.id || existing.conteudoHash !== conteudoHash) return json({ erro: 'Identificador já utilizado para outra mensagem.' }, 409);
      return json({ id: existing.id, status: existing.status });
    }
    const estado = await chamarWhatsApp('status').catch(() => null);
    if (estado?.status !== 'conectado' || !estado.numero) return json({ erro: 'O WhatsApp está desconectado. Conecte o aparelho antes de enviar.' }, 409);
    const original = responderId ? await prisma.mensagemWhatsApp.findFirst({ where: { id: responderId, clienteId: id, conta: estado.numero, externaId: { not: null } }, select: { externaId: true, texto: true, tipo: true, direcao: true } }) : null;
    if (responderId && !original) return json({ erro: 'A mensagem citada não está disponível nesta conversa ou ainda não foi enviada.' }, 400);
    const mensagem = await prisma.$transaction(async tx => {
      const allowed = await tx.cliente.updateMany({ where: { id, ...(acesso.usuario.role === 'ADMIN' ? {} : { OR: [{ responsavelId: acesso.usuario.id }, { responsavelId: null }] }) }, data: { ultimaMensagemEm: new Date() } });
      if (!allowed.count) throw new Error('O responsável mudou. Atualize a conversa.');
      return tx.mensagemWhatsApp.create({ data: {
        clienteId: id, conta: estado.numero!, pedidoId, conteudoHash, autorId: acesso.usuario.id,
        ...(original ? { citacao: { externaId: original.externaId, texto: original.texto.slice(0, 1000), tipo: original.tipo, direcao: original.direcao } } : {}),
        direcao: 'SAIDA', texto, status: 'PENDENTE', tipo: voz ? 'ptt' : midia ? midia.mimeType.startsWith('image/') ? 'image' : midia.mimeType.startsWith('audio/') ? 'audio' : 'document' : 'chat',
        ...(midia ? { midia: { create: midia } } : {}),
      }, select: selecao });
    });
    return json({ id: mensagem.id, status: mensagem.status, mensagem }, 202);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return json({ erro: 'Esta solicitação já foi registrada. Atualize o histórico antes de tentar novamente.' }, 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) return json({ erro: 'Não foi possível salvar a mensagem. Tente novamente.' }, 503);
    return json({ erro: error instanceof Error ? error.message : 'Mensagem inválida.' }, 400);
  }
}
