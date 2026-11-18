import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient();
const userId = randomUUID(), clienteId = randomUUID(), token = randomBytes(32).toString('hex'), conta = 'teste-' + randomUUID();
const ids = Array.from({ length: 110 }, () => randomUUID());
let browser;
try {
  await db.user.create({ data: { id: userId, email: conta + '@example.invalid', password: 'temporario', role: 'USER', sessoes: { create: { tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } } } });
  await db.cliente.create({ data: { id: clienteId, nome: 'Navegação de citações', responsavelId: userId } });
  const start = Date.now() - 120000;
  await db.mensagemWhatsApp.createMany({ data: ids.map((id, i) => ({ id, clienteId, conta, externaId: 'externa-' + id, direcao: 'ENTRADA', status: 'RECEBIDA', texto: `Mensagem ${i}`, enviadoEm: new Date(start + i * 1000),
    ...(i >= 107 ? { citacao: { externaId: i === 109 ? 'externa-' + ids[0] : i === 108 ? 'inexistente' : 'externa-' + ids[106], texto: 'Mensagem citada', tipo: 'chat', direcao: 'ENTRADA' } } : {}),
  })) });
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.createBrowserContext();
  await context.setCookie({ name: 'sessao_segura', value: token, domain: 'localhost', path: '/', httpOnly: true });
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`http://localhost:3000/atendimento?cliente=${clienteId}`, { waitUntil: 'networkidle2' });
  await page.bringToFront();
  const row = id => `[data-mensagem-id="${id}"]`;
  await page.waitForSelector(row(ids[109]));
  assert.equal(await page.$(row(ids[0])), null);
  const old = await page.evaluate(async ({ clienteId, id }) => { const r = await fetch(`/api/atendimento/${clienteId}/mensagens?citadaPor=${id}`); return { status: r.status, data: await r.json() }; }, { clienteId, id: ids[109] });
  assert.equal(old.status, 200); assert.equal(old.data.alvoId, ids[0]); assert.ok(old.data.mensagens.length <= 41);
  await page.click(row(ids[109]) + ' [aria-label="Mensagem citada"]');
  await page.waitForSelector(row(ids[0]) + '[data-destacada="true"]');
  await page.waitForFunction(id => { const el = document.querySelector(`[data-mensagem-id="${id}"]`); const r = el.getBoundingClientRect(); const container = el.parentElement.parentElement.getBoundingClientRect(); return r.top >= container.top && r.bottom <= container.bottom; }, {}, ids[0]);
  if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: process.env.TEST_SCREENSHOT_DIR + '/citacao-destacada.png' });
  await page.waitForSelector('[data-destacada="true"]', { hidden: true });
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Voltar às mensagens recentes')).click());
  await page.waitForSelector(row(ids[109]));
  await page.click(row(ids[107]) + ' [aria-label="Mensagem citada"]');
  await page.waitForSelector(row(ids[106]) + '[data-destacada="true"]');
  await page.click(row(ids[107]) + ' [aria-label="Mensagem citada"]');
  await page.waitForSelector('[data-destacada="true"]', { hidden: true });
  await page.click(row(ids[108]) + ' [aria-label="Mensagem citada"]');
  await page.waitForFunction(() => document.body.textContent.includes('A mensagem original não está disponível'));
  assert.ok(await page.$(row(ids[109])));
  await page.setViewport({ width: 390, height: 844 });
  await page.click(row(ids[109]) + ' [aria-label="Mensagem citada"]');
  await page.waitForSelector(row(ids[0]) + '[data-destacada="true"]');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('OK: salto local e histórico antigo, destaque temporário/repetido, retorno, mensagem ausente e celular.');
} finally {
  await browser?.close();
  await db.mensagemWhatsApp.deleteMany({ where: { conta } });
  await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
}
