import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient(), userId = randomUUID(), otherId = randomUUID();
const ids = Array.from({ length: 25 }, () => randomUUID());
const token = randomBytes(32).toString('hex');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let browser;
try {
  await db.user.create({ data: { id: userId, email: `${userId}@example.invalid`, password: 'teste', role: 'USER', sessoes: { create: { tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } } } });
  await db.user.create({ data: { id: otherId, email: `${otherId}@example.invalid`, password: 'teste', role: 'USER' } });
  for (const [i, id] of ids.entries()) {
    await db.cliente.create({ data: { id, nome: `Foto teste ${String(i).padStart(2, '0')}`, responsavelId: i === 24 ? otherId : userId } });
    await db.$executeRaw`INSERT INTO "FotoContato" ("clienteId", url, "consultadaEm", pendente) VALUES (${id}, 'https://pps.whatsapp.net/test-avatar', NOW(), FALSE)`;
  }
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setCookie({ name: 'sessao_segura', value: token, domain: new URL(base).hostname, path: '/', httpOnly: true });
  const requested = new Set();
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('pps.whatsapp.net')) return void request.respond({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
    if (request.url().endsWith('/api/atendimento/fotos')) for (const id of JSON.parse(request.postData()).ids) requested.add(id);
    void request.continue();
  });
  await page.goto(base + '/atendimento?fila=meus', { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-cliente-id] img');
  assert.ok(requested.size > 0 && requested.size < 24, 'solicita só contatos visíveis');
  const before = requested.size;
  await page.$eval('[data-cliente-id]', el => { el.parentElement.scrollTop = el.parentElement.scrollHeight; });
  await page.waitForFunction(() => !!document.querySelector('[data-cliente-id]:last-child img'));
  assert.ok(requested.size > before);
  const result = await page.evaluate(async ids => {
    const response = await fetch('/api/atendimento/fotos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    return response.json();
  }, [ids[0], ids[24]]);
  assert.deepEqual(new Set(result.fotos.map(f => f.id)), new Set([ids[0], ids[24]]));
  await db.cliente.update({ where: { id: ids[0] }, data: { telefone: '+999' + Date.now().toString().slice(-10) } });
  await db.$executeRaw`UPDATE "FotoContato" SET "consultadaEm" = NOW() - INTERVAL '2 days' WHERE "clienteId" = ${ids[0]}`;
  const pending = await page.evaluate(async id => (await (await fetch('/api/atendimento/fotos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })).json()).fotos[0].pendente, ids[0]);
  assert.equal(pending, true, 'cache vencido enfileira consulta sem esperar pelo WhatsApp');
  assert.equal((await fetch(base + '/api/atendimento/fotos', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [ids[0]] }) })).status, 401);
  await page.$eval('[data-cliente-id]:last-child img', el => el.dispatchEvent(new Event('error')));
  await page.waitForFunction(() => !document.querySelector('[data-cliente-id]:last-child img'));
  console.log('OK: fotos visíveis, rolagem, cache compartilhado, acesso compartilhado USER, autenticação e fallback de imagem.');
} finally {
  await browser?.close();
  await db.cliente.deleteMany({ where: { id: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  await db.$disconnect();
}
