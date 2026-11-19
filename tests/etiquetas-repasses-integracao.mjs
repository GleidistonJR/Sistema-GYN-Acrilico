import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { vinculoColaboradorTeste } from './fixtures/colaborador.mjs';

if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1.');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const db = new PrismaClient();
const [ana, maria, recepcao, clienteId, etiquetaId] = Array.from({ length: 5 }, () => randomUUID());
const nome = 'Conversa de teste ' + clienteId;
const nomeEtiqueta = 'Retirada na Recepção ' + etiquetaId.slice(0, 8);
const conta = 'fluxo-etiqueta-' + randomUUID();
const tokens = [ana, maria, recepcao].map(() => randomBytes(32).toString('hex'));
const linha = `[data-cliente-id="${clienteId}"]`;
const modal = 'dialog[open]';
let browser;

async function abrirPainel(indice, params) {
  const contexto = await browser.createBrowserContext();
  await contexto.setCookie({ name: 'sessao_segura', value: tokens[indice], url: base, httpOnly: true });
  const page = await contexto.newPage();
  await page.goto(base + '/atendimento?' + new URLSearchParams(params), { waitUntil: 'domcontentloaded' });
  return page;
}

async function detalhes(page) {
  await page.bringToFront();
  await page.locator('button[aria-label="Organizar cliente"]').click();
  await page.waitForSelector(modal + ' select[name="responsavelId"]');
}

async function detalhesPelaLista(page) {
  await page.bringToFront();
  await page.locator(`button[aria-label="Opções da conversa com ${nome}"]`).click();
  assert.equal(await page.$('::-p-text(Excluir conversa)'), null);
  await page.locator('::-p-text(Organizar cliente)').click();
  await page.waitForSelector(modal + ' select[name="responsavelId"]');
}

async function repassar(page, destino) {
  await detalhes(page);
  await page.select(modal + ' select[name="responsavelId"]', destino ?? '');
  await page.locator('::-p-text(Alterar responsável)').click();
  await page.waitForFunction(() => document.querySelector('dialog[open]')?.innerText.includes('Responsável atualizado.'));
  const cliente = await db.cliente.findUniqueOrThrow({ where: { id: clienteId }, select: { responsavelId: true } });
  assert.equal(cliente.responsavelId, destino);
  await page.keyboard.press('Escape');
}

try {
  for (const [indice, id] of [ana, maria, recepcao].entries()) {
    await db.user.create({ data: {
      id, email: id + '@example.invalid', password: '!teste',
      role: id === recepcao ? 'RECEPCAO' : 'USER',
      ...(id === recepcao ? {} : { colaborador: vinculoColaboradorTeste(id) }),
      sessoes: { create: { tokenHash: createHash('sha256').update(tokens[indice]).digest('hex'), expiresAt: new Date(Date.now() + 600000) } },
    } });
  }
  await db.cliente.create({ data: { id: clienteId, nome, responsavelId: ana, ultimaMensagemEm: new Date() } });
  await db.etiqueta.create({ data: { id: etiquetaId, nome: nomeEtiqueta } });
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const painelRecepcao = await abrirPainel(2, { fila: 'todos', etiqueta: etiquetaId });
  await painelRecepcao.waitForFunction(() => document.querySelector('select[aria-label="Etiqueta"]')?.value !== '');
  assert.equal(await painelRecepcao.$(linha), null);

  const painelMaria = await abrirPainel(1, { fila: 'todos' });
  await detalhesPelaLista(painelMaria);
  assert.equal(new URL(painelMaria.url()).searchParams.has('cliente'), false);
  const checkbox = modal + ' label::-p-text(' + nomeEtiqueta + ')';
  const campo = modal + ' label:has(span) input[type="checkbox"]';
  await painelMaria.locator(checkbox).click();
  await painelMaria.waitForFunction((selector, nome) => [...document.querySelectorAll(selector)].some(el =>
    el.labels[0]?.textContent.trim() === nome && el.checked && !el.disabled), {}, campo, nomeEtiqueta);
  await painelMaria.keyboard.press('Escape');
  assert.equal((await db.cliente.findUniqueOrThrow({ where: { id: clienteId } })).responsavelId, ana);

  await painelRecepcao.bringToFront();
  await painelRecepcao.waitForSelector(linha);
  await painelRecepcao.reload({ waitUntil: 'domcontentloaded' });
  await painelRecepcao.waitForSelector(linha);
  await detalhesPelaLista(painelRecepcao);
  await painelRecepcao.locator(checkbox).click();
  await painelRecepcao.waitForSelector(linha, { hidden: true });
  assert.equal((await db.cliente.findUniqueOrThrow({ where: { id: clienteId } })).responsavelId, ana);

  await db.mensagemWhatsApp.create({ data: {
    conta, clienteId, externaId: randomUUID(), direcao: 'ENTRADA', status: 'RECEBIDA', texto: 'Nova mensagem de teste',
  } });
  for (const fila of ['meus', 'todos']) {
    const resposta = await fetch(base + '/api/atendimento/clientes?' + new URLSearchParams({ fila, busca: clienteId }), {
      headers: { Cookie: 'sessao_segura=' + tokens[0] },
    });
    const { clientes } = await resposta.json();
    assert.equal(clientes[0]?.responsavelId, ana);
    assert.equal(clientes[0]?.naoLida, true);
  }

  const painelAna = await abrirPainel(0, { fila: 'todos', cliente: clienteId });
  await repassar(painelAna, maria);
  await painelAna.waitForSelector('button[aria-label="Assumir cliente"]');
  await painelAna.locator('button[aria-label="Assumir cliente"]').click();
  await painelAna.waitForSelector('button[aria-label="Desatribuir cliente"]');
  await painelMaria.bringToFront();
  await painelMaria.locator(linha).click();
  await repassar(painelMaria, null);
  const historico = await db.atribuicaoCliente.findMany({ where: { clienteId }, orderBy: { createdAt: 'asc' } });
  assert.deepEqual(historico.map(item => [item.atorId, item.anteriorId, item.novoId]), [
    [ana, ana, maria], [ana, maria, ana], [maria, ana, null],
  ]);
  console.log('Etiquetas compartilhadas, filtro da recepção, leitura por usuário, repasse, tomada e desatribuição verificados.');
} finally {
  await browser?.close();
  await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.etiqueta.deleteMany({ where: { id: etiquetaId } });
  await db.colaborador.deleteMany({ where: { userId: { in: [ana, maria] } } });
  await db.user.deleteMany({ where: { id: recepcao } });
  await db.$disconnect();
}
