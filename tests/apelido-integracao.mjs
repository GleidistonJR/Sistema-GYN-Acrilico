import { vinculoColaboradorTeste } from './fixtures/colaborador.mjs';
import { unlink } from 'node:fs/promises';
import { caminhoArquivo } from '../scripts/whatsapp-arquivos.mjs';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient(), users = [randomUUID(), randomUUID()], clienteId = randomUUID();
const tokens = users.map(() => randomBytes(32).toString('hex'));
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let browser;
try {
  for (const [i, id] of users.entries()) await db.user.create({ data: { id, colaborador: vinculoColaboradorTeste(id), email: `${id}@example.invalid`, password: 'teste', role: 'USER', sessoes: { create: { tokenHash: createHash('sha256').update(tokens[i]).digest('hex'), expiresAt: new Date(Date.now() + 600000) } } } });
  // No phone and no WhatsApp identity: the real worker cannot transmit these fixtures.
  await db.cliente.create({ data: { id: clienteId, nome: 'Validação de assinatura sem destinatário' } });
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const pages = [];
  for (const token of tokens) {
    const context = await browser.createBrowserContext();
    await context.setCookie({ name: 'sessao_segura', value: token, domain: new URL(base).hostname, path: '/', httpOnly: true, secure: base.startsWith('https:') });
    const page = await context.newPage(); page.setDefaultTimeout(45000); pages.push(page);
    await page.goto(base + '/atendimento?fila=fila&cliente=' + clienteId, { waitUntil: 'networkidle2' });
  }
  async function rename(page, nome) {
    await page.bringToFront(); await page.click('[aria-label="Meu apelido"]');
    await page.waitForSelector('dialog input[name="apelido"]');
    await page.click('dialog input[name="apelido"]', { clickCount: 3 }); await page.keyboard.press('Backspace');
    await page.type('dialog input[name="apelido"]', nome);
    // Submitted IDs must not allow changing someone else's profile.
    await page.evaluate(id => { const field = document.createElement('input'); field.type = 'hidden'; field.name = 'userId'; field.value = id; document.querySelector('dialog form').append(field); }, users[1]);
    await page.click('dialog button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('dialog')?.textContent.includes('Alteração salva.'));
    await page.click('dialog [aria-label="Fechar"]');
    await page.waitForFunction(nome => document.querySelector('[aria-label="Meu apelido"]')?.textContent.includes(nome), {}, nome.trim());
  }
  await rename(pages[0], 'Junior');
  const [other] = await db.$queryRaw`SELECT apelido FROM "User" WHERE id = ${users[1]}`;
  assert.equal(other.apelido, null);
  await rename(pages[1], 'Claudia');
  async function send(page, pedidoId, image = false) {
    return page.evaluate(async ({ clienteId, pedidoId, image }) => {
      const form = new FormData(); form.set('pedidoId', pedidoId); form.set('texto', 'Mensagem normal'); form.set('apelido', 'Falsificado');
      if (image) {
        const data = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='), c => c.charCodeAt(0));
        const grant = await fetch(`/api/atendimento/${clienteId}/anexos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'teste.png', mimeType: 'image/png', tamanho: data.length }) });
        const ticket = await grant.json(); if (!grant.ok) throw new Error(ticket.erro);
        const upload = await fetch(ticket.url, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: data });
        if (!upload.ok) throw new Error(await upload.text());
        form.set('uploadToken', ticket.token);
      }
      const response = await fetch(`/api/atendimento/${clienteId}/mensagens`, { method: 'POST', body: form });
      return { status: response.status, data: await response.json() };
    }, { clienteId, pedidoId, image });
  }
  const pedido = randomUUID();
  const junior = await send(pages[0], pedido);
  assert.equal(junior.status, 202); assert.equal(junior.data.mensagem.texto, '*Junior:*\nMensagem normal');
  const claudia = await send(pages[1], randomUUID(), true);
  assert.equal(claudia.status, 202); assert.equal(claudia.data.mensagem.texto, '*Claudia:*\nMensagem normal');
  await rename(pages[0], 'Junior novo');
  const retry = await send(pages[0], pedido);
  assert.equal(retry.status, 200); assert.equal(retry.data.id, junior.data.id);
  const saved = await db.mensagemWhatsApp.findUnique({ where: { id: junior.data.id } });
  assert.equal(saved.texto, '*Junior:*\nMensagem normal');
  assert.equal(await db.mensagemWhatsApp.count({ where: { pedidoId: pedido } }), 1);
  await pages[0].reload({ waitUntil: 'networkidle2' });
  await pages[0].waitForFunction(() => document.querySelector('[aria-label="Meu apelido"]')?.textContent.includes('Junior novo'));
  await pages[0].waitForSelector(`[data-mensagem-id="${junior.data.id}"] strong`);
  console.log('OK: dois USER configuram apelidos independentes, assinatura no texto e imagem, servidor ignora apelido falsificado, histórico imutável, retry idempotente e cabeçalho em negrito. Nenhum destinatário real.');
} finally {
  await browser?.close();
  for (const id of users) {
    const tickets = await db.$queryRaw`SELECT payload FROM "TransferenciaWhatsApp" WHERE payload->>'userId' = ${id}`;
    for (const t of tickets) if (t.payload.chave) await unlink(caminhoArquivo(t.payload.chave)).catch(() => {});
    await db.$executeRaw`DELETE FROM "TransferenciaWhatsApp" WHERE payload->>'userId' = ${id}`;
  }
  await db.mensagemWhatsApp.deleteMany({ where: { clienteId } });
  await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.colaborador.deleteMany({ where: { userId: { in: users } } });
  await db.$disconnect();
}
