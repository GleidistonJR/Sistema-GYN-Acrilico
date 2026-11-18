import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient(), userId = randomUUID(), clienteId = randomUUID(), conta = 'teste-' + randomUUID();
const token = randomBytes(32).toString('hex');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let browser;
try {
  await db.user.create({ data: { id: userId, email: userId + '@example.invalid', password: 'teste', role: 'USER', sessoes: { create: { tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } } } });
  await db.cliente.create({ data: { id: clienteId, nome: 'Teste de latência', responsavelId: userId } });
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage(); page.setDefaultTimeout(45000);
  await page.setCookie({ name: 'sessao_segura', value: token, domain: new URL(base).hostname, path: '/', httpOnly: true, secure: base.startsWith('https:') });
  await page.goto(base + '/atendimento?cliente=' + clienteId, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[aria-label="Tempo real ativo"]');
  // Make the five-second fallback unable to explain the result: the stream must be active.
  await page.waitForFunction(() => document.querySelector('section')?.textContent.includes('Comece a conversa'));
  const start = performance.now();
  await db.mensagemWhatsApp.create({ data: { clienteId, conta, direcao: 'ENTRADA', status: 'RECEBIDA', texto: 'Recebida por evento' } });
  await page.waitForFunction(() => document.querySelector('section')?.textContent.includes('Recebida por evento'), { polling: 25 });
  const receivedMs = Math.round(performance.now() - start);
  const sent = await db.mensagemWhatsApp.create({ data: { clienteId, conta, autorId: userId, direcao: 'SAIDA', status: 'PENDENTE', texto: 'Saída simulada' } });
  await page.waitForFunction(id => document.querySelector(`[data-mensagem-id="${id}"]`)?.textContent.includes('Na fila'), {}, sent.id);
  const update = performance.now();
  await db.mensagemWhatsApp.update({ where: { id: sent.id }, data: { status: 'ENTREGUE', ack: 2 } });
  await page.waitForFunction(id => document.querySelector(`[data-mensagem-id="${id}"]`)?.textContent.includes('Entregue'), { polling: 25 }, sent.id);
  const statusMs = Math.round(performance.now() - update);
  assert.ok(receivedMs < 4000, `Recebimento demorou ${receivedMs} ms`);
  assert.ok(statusMs < 4000, `Confirmação demorou ${statusMs} ms`);
  assert.equal((await fetch(base + '/api/atendimento/eventos')).status, 401);
  // Force a reconnect and ensure a fresh authenticated stream becomes ready again.
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('[aria-label="Tempo real ativo"]');
  console.log(JSON.stringify({ base, receivedMs, statusMs, realtime: true, reconnect: true, realMessagesSent: 0 }));
} finally {
  await browser?.close();
  await db.mensagemWhatsApp.deleteMany({ where: { conta } });
  await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
}
