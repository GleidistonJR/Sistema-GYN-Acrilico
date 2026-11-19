import { vinculoColaboradorTeste } from './fixtures/colaborador.mjs';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { validarMidia } from '../lib/whatsapp/conteudo.mjs';

if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient();
const id = randomUUID(), userId = randomUUID(), token = randomBytes(32).toString('hex');
const conta = 'teste-' + randomUUID();
let browser;
try {
  await db.user.create({ data: { id: userId, colaborador: vinculoColaboradorTeste(userId), email: conta + '@example.invalid', password: '!temporario', role: 'USER', sessoes: { create: { tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } } } });
  await db.cliente.create({ data: { id, nome: 'Cliente de validação', responsavelId: userId } });
  const incoming = texto => db.mensagemWhatsApp.create({ data: { clienteId: id, conta, externaId: randomUUID(), direcao: 'ENTRADA', status: 'RECEBIDA', texto,
    citacao: { externaId: 'original', texto: 'Pedido anterior', tipo: 'chat', direcao: 'SAIDA' },
  } });
  await incoming('Mensagem privada sem prévia');
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const context = await browser.createBrowserContext();
  await context.setCookie({ name: 'sessao_segura', value: token, domain: 'localhost', path: '/', httpOnly: true });
  const page = await context.newPage(); page.setDefaultTimeout(45000); page.on('pageerror', e => console.log('BROWSER:', e.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/atendimento', { waitUntil: 'networkidle2' });
  await page.bringToFront();
  const row = `[data-cliente-id="${id}"]`;
  await page.waitForSelector(row + ' [aria-label="Mensagens não lidas"]');
  assert.equal(await page.$eval('aside', el => el.textContent.includes('Mensagem privada')), false);
  const api = (path, body) => page.evaluate(async ({path, body}) => {
    const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    return { status: r.status, data: await r.json() };
  }, { path, body });
  const list = await api('/api/atendimento/clientes');
  assert.equal(list.data.clientes[0].naoLida, true);
  assert.equal(JSON.stringify(list).includes('Mensagem privada'), false);
  const history = await api(`/api/atendimento/${id}/mensagens`);
  await incoming('Chegou durante a leitura');
  assert.equal((await api(`/api/atendimento/${id}/leitura`, { versao: history.data.versaoEntrada })).status, 200);
  assert.equal((await api('/api/atendimento/clientes')).data.clientes[0].naoLida, true);
  console.log('OK: lista sem prévia e cursor de leitura preserva mensagem concorrente.');
  await page.click(row);
  await page.waitForFunction(() => document.querySelector('article')?.textContent.includes('Mensagem privada'));
  await page.waitForFunction(selector => !document.querySelector(selector + ' [aria-label="Mensagens não lidas"]'), {}, row);
  await page.waitForSelector('[aria-label="Tempo real ativo"]');
  await page.waitForSelector('[aria-label="Mensagem citada"]');
  await page.click('article [aria-label="Responder esta mensagem"]');
  await page.waitForSelector('[aria-label="Respondendo à mensagem"]');
  await page.click('[aria-label="Cancelar resposta"]');
  assert.equal(await page.$('[aria-label="Respondendo à mensagem"]'), null);
  await page.click('article [aria-label="Responder esta mensagem"]');
  const start = Date.now();
  await incoming('Atualização automática confirmada');
  await page.waitForFunction(() => document.querySelector('section')?.textContent.includes('Atualização automática confirmada'));
  console.log(`OK: mensagem exibida automaticamente em ${Date.now() - start} ms (inclui gravação no banco).`);
  assert.equal(await page.$eval('aside', el => el.textContent.includes('Atualização automática')), false);
  await page.waitForFunction(selector => !document.querySelector(selector + ' [aria-label="Mensagens não lidas"]'), {}, row);
  await page.click('[aria-label="Gravar áudio"]');
  await page.waitForSelector('[aria-label="Parar gravação"]');
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('0:01'));
  await page.click('[aria-label="Parar gravação"]');
  await page.waitForSelector('[aria-label="Ouvir áudio antes de enviar"]');
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (url, options) => {
      if (String(url).endsWith('/mensagens') && options?.method === 'POST') {
        const file = options.body.get('arquivo');
        window.__audioRequest = { responderId: options.body.get('responderId'), voz: options.body.get('voz'), type: file.type, bytes: [...new Uint8Array(await file.arrayBuffer())] };
        return new Response(JSON.stringify({ id: 'simulado', status: 'PENDENTE' }), { status: 202 });
      }
      return original(url, options);
    };
  });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !!window.__audioRequest);
  const audio = await page.evaluate(() => window.__audioRequest);
  assert.ok(audio.responderId);
  await page.waitForSelector('[aria-label="Respondendo à mensagem"]', { hidden: true });
  assert.equal(audio.voz, 'true'); assert.equal(validarMidia(Buffer.from(audio.bytes), audio.type), 'audio/webm');
  await page.waitForSelector('[aria-label="Ouvir áudio antes de enviar"]', { hidden: true });
  await page.waitForSelector('[aria-label="Gravar áudio"]:not(:disabled)');
  await page.click('[aria-label="Gravar áudio"]');
  await page.waitForSelector('[aria-label="Descartar gravação"]');
  await page.click('[aria-label="Descartar gravação"]');
  await page.waitForSelector('[aria-label="Gravar áudio"]');
  assert.equal(await page.$('[aria-label="Ouvir áudio antes de enviar"]'), null);
  console.log('OK: microfone simulado gera áudio válido, prévia, envio interceptado e descarte.');
  if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: process.env.TEST_SCREENSHOT_DIR + '/inbox-desktop.png' });
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: process.env.TEST_SCREENSHOT_DIR + '/inbox-mobile.png' });
  await page.click('[aria-label="Voltar aos clientes"]');
  await page.waitForSelector(row, { visible: true });
  console.log('OK: clique na linha, leitura automática, desktop e navegação móvel.');
} finally {
  await browser?.close();
  await db.mensagemWhatsApp.deleteMany({ where: { conta } });
  await db.cliente.deleteMany({ where: { id } });
  await db.colaborador.deleteMany({ where: { userId: userId } });
  await db.$disconnect();
  console.log('Dados temporários removidos. Nenhuma mensagem enviada ao WhatsApp.');
}
