import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient(), userId = randomUUID(), clienteId = randomUUID(), token = randomBytes(32).toString('hex');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let browser;
try {
  await db.user.create({ data: { id: userId, email: `${userId}@example.invalid`, password: 'teste', role: 'USER', sessoes: { create: { tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } } } });
  await db.cliente.create({ data: { id: clienteId, nome: 'Teste do compositor', responsavelId: userId } });
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage(); page.setDefaultTimeout(30000);
  await page.setViewport({ width: 1280, height: 900 });
  await page.setCookie({ name: 'sessao_segura', value: token, domain: new URL(base).hostname, path: '/', httpOnly: true, secure: base.startsWith('https:') });
  // All sends are intercepted twice; no message may reach the real queue.
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.method() === 'POST' && /\/mensagens$/.test(request.url())) return void request.abort();
    void request.continue();
  });
  await page.evaluateOnNewDocument(() => {
    window.__envios = []; window.__falhar = false;
    const original = window.fetch.bind(window);
    window.fetch = async (url, options) => {
      if (options?.method !== 'POST' || !String(url).endsWith('/mensagens')) return original(url, options);
      const form = options.body, file = form.get('arquivo');
      window.__envios.push({ pedidoId: form.get('pedidoId'), texto: form.get('texto'), nome: file?.name, mime: file?.type, dados: file ? await file.text() : null });
      await new Promise(resolve => setTimeout(resolve, 200));
      if (window.__falhar) { window.__falhar = false; return Response.json({ erro: 'Falha simulada' }, { status: 503 }); }
      return Response.json({ mensagem: { id: crypto.randomUUID(), texto: form.get('texto'), tipo: 'chat', direcao: 'SAIDA', status: 'PENDENTE', enviadoEm: new Date().toISOString(), externaId: null, citacao: null, autor: null, midia: null } }, { status: 202 });
    };
  });
  await page.goto(base + '/atendimento?cliente=' + clienteId, { waitUntil: 'networkidle2' });
  const input = 'textarea[aria-label="Mensagem"]';
  await page.waitForSelector(input + ':not(:disabled)'); await page.focus(input);
  const initial = await page.$eval(input, el => el.clientHeight);
  await page.type(input, 'Primeira linha'); await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift'); await page.keyboard.type('Segunda linha');
  assert.equal(await page.evaluate(() => window.__envios.length), 0);
  assert.ok(await page.$eval(input, el => el.clientHeight) > initial);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__envios.length === 1 && !document.querySelector('textarea').disabled);
  assert.equal(await page.evaluate(() => window.__envios[0].texto), 'Primeira linha\nSegunda linha');
  assert.equal(await page.$eval(input, el => el.value), '');
  await page.focus(input); await page.keyboard.type('Rascunho');
  await page.$eval(input, el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })));
  assert.equal(await page.evaluate(() => window.__envios.length), 1);
  for (let i = 0; i < 9; i++) { await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift'); await page.keyboard.type('Mais uma linha'); }
  const size = await page.$eval(input, el => ({ height: el.offsetHeight, scroll: el.scrollHeight, overflow: getComputedStyle(el).overflowY }));
  assert.ok(size.height <= 148 && size.height > 120); assert.ok(size.scroll > size.height); assert.equal(size.overflow, 'auto');
  const draft = await page.$eval(input, el => el.value);
  async function drop(names, target = 'section') {
    return page.evaluate(({ names, target }) => {
      const data = new DataTransfer();
      for (const name of names) data.items.add(new File(['%PDF-1.4\nArquivo de teste'], name, { type: '' }));
      const el = document.querySelector(target);
      el.dispatchEvent(new DragEvent('dragenter', { dataTransfer: data, bubbles: true, cancelable: true }));
      return !el.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
    }, { names, target });
  }
  assert.equal(await drop(['orcamento.pdf']), true);
  await page.waitForFunction(() => window.__envios.length === 2 && !document.querySelector('textarea').disabled);
  const sent = await page.evaluate(() => window.__envios[1]);
  assert.equal(sent.nome, 'orcamento.pdf'); assert.equal(sent.mime, 'application/pdf'); assert.equal(sent.texto, ''); assert.equal(sent.dados, '%PDF-1.4\nArquivo de teste');
  assert.equal(await page.$eval(input, el => el.value), draft);
  await page.evaluate(() => { window.__falhar = true; }); await drop(['repetir.pdf']);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Tentar enviar arquivo novamente'));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Tentar enviar arquivo novamente').click());
  await page.waitForFunction(() => window.__envios.length === 4 && !document.querySelector('textarea').disabled);
  assert.equal(await page.evaluate(() => window.__envios[2].pedidoId), await page.evaluate(() => window.__envios[3].pedidoId));
  await drop(['a.pdf', 'b.pdf']); await drop(['programa.exe']); await drop(['fora.pdf'], 'aside');
  assert.equal(await page.evaluate(() => window.__envios.length), 4);
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('textarea').offsetHeight <= 148);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await db.mensagemWhatsApp.count({ where: { clienteId } }), 0);
  console.log('OK: Enter, Shift+Enter, IME, seis linhas/rolagem, envio PDF por drop, rascunho preservado, retry com mesmo ID, rejeições e mobile. Nenhuma mensagem real enviada.');
} finally {
  await browser?.close(); await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.user.deleteMany({ where: { id: userId } }); await db.$disconnect();
}
