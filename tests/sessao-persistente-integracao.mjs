import { vinculoColaboradorTeste } from './fixtures/colaborador.mjs';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';

if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient();
const userId = randomUUID(), token = randomBytes(32).toString('hex');
const tokenHash = createHash('sha256').update(token).digest('hex');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let browser;
try {
  await db.user.create({ data: { id: userId, colaborador: vinculoColaboradorTeste(userId), email: `${userId}@example.invalid`, password: 'teste', role: 'USER',
    sessoes: { create: { tokenHash, expiresAt: new Date(Date.now() + 600000) } } } });
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let page = await browser.newPage();
  await page.setCookie({ name: 'sessao_segura', value: token, url: base, httpOnly: true, secure: base.startsWith('https:') });
  await page.goto(base + '/atendimento', { waitUntil: 'domcontentloaded' });
  assert.ok(!page.url().includes('/login'));
  const cookie = (await page.cookies()).find(c => c.name === 'sessao_segura');
  assert.ok(cookie.expires * 1000 > Date.now() + 360 * 86400000);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, 'Lax');
  const renewed = await db.sessao.findUnique({ where: { tokenHash } });
  assert.ok(renewed.expiresAt.getTime() > Date.now() + 360 * 86400000);
  // A new browser process accepts the persisted cookie; no login is required.
  await browser.close();
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  page = await browser.newPage();
  await page.setCookie(cookie);
  await page.goto(base + '/atendimento', { waitUntil: 'domcontentloaded' });
  assert.ok(!page.url().includes('/login'));
  assert.equal((await db.sessao.findUnique({ where: { tokenHash } })).expiresAt.getTime(), renewed.expiresAt.getTime());
  // Revocation must win even when the browser keeps its persistent cookie.
  await db.sessao.delete({ where: { tokenHash } });
  await page.goto(base + '/atendimento', { waitUntil: 'domcontentloaded' });
  assert.ok(page.url().includes('/login'));
  assert.equal(await db.sessao.count({ where: { tokenHash } }), 0);
  // Expired sessions must never be revived by automatic renewal.
  await db.sessao.create({ data: { tokenHash, userId, expiresAt: new Date(Date.now() - 60000) } });
  await page.goto(base + '/atendimento', { waitUntil: 'domcontentloaded' });
  assert.ok(page.url().includes('/login'));
  console.log('OK: sessão antiga renovada, cookie persistente, novo navegador, sem escrita repetida, revogação e expiração respeitadas.');
} finally {
  await browser?.close();
  await db.colaborador.deleteMany({ where: { userId: userId } });
  await db.$disconnect();
}
