import { vinculoColaboradorTeste } from './fixtures/colaborador.mjs';
// Explicit opt-in: creates isolated temporary records and removes only their IDs.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';

if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Defina RUN_DATABASE_INTEGRATION=1 para autorizar os registros temporários.');
const prisma = new PrismaClient();
const origem = 'http://127.0.0.1:3000';
const prefix = randomUUID();
const userIds = [randomUUID(), randomUUID()];
const clienteId = randomUUID();
let browser;
try {
  const tokens = [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')];
  await prisma.$transaction(userIds.map((id, index) => prisma.user.create({ data: {
    id, colaborador: vinculoColaboradorTeste(id), email: `teste-${prefix}-${index}@example.invalid`, password: '!conta-temporaria-sem-login', role: index === 0 ? 'ADMIN' : 'USER',
    sessoes: { create: { tokenHash: createHash('sha256').update(tokens[index]).digest('hex'), expiresAt: new Date(Date.now() + 600000) } },
  } })));
  await prisma.cliente.create({ data: { id: clienteId, nome: `Teste ${prefix}`, telefone: '+999' + String(Date.now()).slice(-11) } });
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.WHATSAPP_BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const pages = [];
  for (const token of tokens) {
    const context = await browser.createBrowserContext();
    await context.setCookie({ name: 'sessao_segura', value: token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    await page.setViewport({ width: 1440, height: 1000 });
    pages.push(page);
  }
  await Promise.all(pages.map(page => page.goto(`${origem}/atendimento?fila=fila&busca=${prefix}`, { waitUntil: 'networkidle2' })));
  for (const page of pages) assert.ok((await page.$('article form input[value="assumir"]')));
  const responses = pages.map(page => page.waitForResponse(response => response.request().method() === 'POST'));
  await Promise.all(pages.map(page => page.$eval('article form input[value="assumir"]', element => element.form.requestSubmit())));
  await Promise.all(responses);
  const claimed = await prisma.cliente.findUniqueOrThrow({ where: { id: clienteId }, include: { atribuicoes: true } });
  assert.ok(userIds.includes(claimed.responsavelId));
  assert.equal(claimed.atribuicoes.length, 1);
  console.log('OK: duas sessões disputam o cliente; um único responsável e um registro de atribuição.');

  await prisma.cliente.update({ where: { id: clienteId }, data: { responsavelId: userIds[0] } });
  await pages[1].goto(`${origem}/atendimento?fila=todos&busca=${prefix}`, { waitUntil: 'networkidle2' });
  assert.equal(await pages[1].$('article'), null);
  assert.equal(await pages[1].evaluate(async () => (await fetch('/api/whatsapp/status')).status), 403);
  console.log('OK: vendedor não acessa outra carteira nem recebe o QR Code.');

  await pages[0].goto(origem + '/atendimento/conexao', { waitUntil: 'networkidle2' });
  await pages[0].waitForFunction(() => !document.body.innerText.includes('Consultando…'));
  await pages[0].evaluate(() => {
    const gerar = [...document.querySelectorAll('button')].find(button => button.textContent === 'Gerar QR Code');
    gerar?.click();
  });
  await pages[0].waitForFunction(() => document.querySelector('img[alt="QR Code para vincular o WhatsApp da empresa"]') || document.body.innerText.includes('Aparelho conectado'));
  assert.equal(await pages[0].evaluate(async () => (await fetch('/api/whatsapp/status')).status), 200);
  if (process.env.TEST_SCREENSHOT_DIR) {
    await pages[0].screenshot({ path: process.env.TEST_SCREENSHOT_DIR + '/whatsapp-desktop.png', fullPage: true });
    await pages[0].setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
    await pages[0].waitForFunction(() => document.querySelector('img[alt="QR Code para vincular o WhatsApp da empresa"]') || document.body.innerText.includes('Aparelho conectado'));
    await pages[0].screenshot({ path: process.env.TEST_SCREENSHOT_DIR + '/whatsapp-mobile.png', fullPage: true });
    assert.ok(await pages[0].evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  console.log('OK: administrador visualiza o QR real; layout móvel sem transbordamento horizontal.');
} finally {
  await browser?.close();
  await prisma.cliente.deleteMany({ where: { id: clienteId } });
  await prisma.colaborador.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.$disconnect();
  console.log('Registros temporários de teste removidos.');
}
