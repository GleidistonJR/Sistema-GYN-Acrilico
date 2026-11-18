import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient();
const users = [randomUUID(), randomUUID()], clienteId = randomUUID();
const tokens = users.map(() => randomBytes(32).toString('hex'));
const phone = '+999' + Date.now().toString().slice(-10);
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let browser;
try {
  for (let i = 0; i < users.length; i++) await db.user.create({ data: { id: users[i], email: `teste-${users[i]}@example.invalid`, password: 'temporario', role: 'USER', sessoes: { create: { tokenHash: createHash('sha256').update(tokens[i]).digest('hex'), expiresAt: new Date(Date.now() + 600000) } } } });
  await db.cliente.create({ data: { id: clienteId, nome: phone, telefone: phone } });
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const pages = [];
  for (const token of tokens) {
    const context = await browser.createBrowserContext();
    await context.setCookie({ name: 'sessao_segura', value: token, domain: new URL(base).hostname, path: '/', httpOnly: true, secure: base.startsWith('https:') });
    const page = await context.newPage(); page.setDefaultTimeout(45000); pages.push(page);
    await page.goto(`${base}/atendimento?fila=fila&cliente=${clienteId}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[aria-label="Organizar cliente"]');
  }
  async function rename(page, name) {
    await page.bringToFront();
    await page.click('[aria-label="Organizar cliente"]');
    await page.waitForSelector('dialog input[name="nome"]');
    await page.click('dialog input[name="nome"]', { clickCount: 3 });
    await page.keyboard.press('Backspace'); await page.type('dialog input[name="nome"]', name);
    await page.evaluate(() => [...document.querySelectorAll('dialog button')].find(b => b.textContent === 'Salvar nome').click());
    await page.waitForFunction(() => document.querySelector('dialog')?.textContent.includes('Alteração salva.'));
    await page.click('dialog [aria-label="Fechar"]');
    await page.waitForFunction(name => document.querySelector('section h2')?.textContent === name, {}, name.trim());
  }
  await rename(pages[0], '  Junior de teste  ');
  await pages[1].bringToFront();
  await pages[1].waitForFunction(name => document.querySelector('section h2')?.textContent === name, {}, 'Junior de teste');
  assert.ok(await pages[1].$eval(`[data-cliente-id="${clienteId}"]`, el => el.textContent.includes('Junior de teste')));
  await rename(pages[1], 'Contato atualizado pela vendedora');
  await pages[0].bringToFront();
  await pages[0].reload({ waitUntil: 'networkidle2' });
  await pages[0].waitForFunction(() => document.querySelector('section h2')?.textContent === 'Contato atualizado pela vendedora');
  const saved = await db.cliente.findUnique({ where: { id: clienteId } });
  assert.equal(saved.nome, 'Contato atualizado pela vendedora');
  assert.equal(saved.telefone, phone); assert.equal(saved.responsavelId, null);
  await db.cliente.update({ where: { id: clienteId }, data: { responsavelId: users[0] } });
  assert.equal(await pages[1].evaluate(async id => (await fetch(`/api/atendimento/${id}/detalhes`)).status, clienteId), 403);
  console.log('OK: dois USER renomeiam contato da fila, nome compartilhado e persistente, telefone/responsável preservados e acesso protegido.');
} finally {
  await browser?.close();
  await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
