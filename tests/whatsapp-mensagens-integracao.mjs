import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { criarServicoMensagens } from '../scripts/whatsapp-mensagens.mjs';
import { variantesTelefone, telefoneDoJid, validarMidia } from '../lib/whatsapp/conteudo.mjs';
import { audioWebm } from './fixtures/audio.mjs';

if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1.');
const prisma = new PrismaClient();
const conta = 'teste-' + randomUUID();
const users = [randomUUID(), randomUUID()];
const clienteId = randomUUID();
const phone = '+999' + String(Date.now()).slice(-11);
const jid = phone.slice(1) + '@c.us';
const lid = '123456789012345@lid';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
const client = new EventEmitter();
let sends = 0;
let lastOptions;
let lastPayload;
let shouldFail = false;
client.getNumberId = async number => ({ _serialized: number + '@c.us' });
client.getContactLidAndPhone = async () => [{ lid, pn: jid }];
client.getContactById = async () => ({ pushname: 'Contato de teste' });
client.sendMessage = async (_jid, payload, options) => {
  lastOptions = options;
  lastPayload = payload;
  sends++;
  if (shouldFail) throw new Error('Simulação: conexão interrompida após tentativa');
  const message = { id: { _serialized: randomUUID() }, fromMe: true, to: jid, from: 'empresa', type: 'chat', body: typeof payload === 'string' ? payload : 'arquivo', timestamp: Date.now() / 1000, ack: 1 };
  client.emit('message_create', message);
  return message;
};
let browser;
let service;
try {
  const tokens = users.map(() => randomBytes(32).toString('hex'));
  for (let i = 0; i < users.length; i++) await prisma.user.create({ data: {
    id: users[i], email: `${conta}-${i}@example.invalid`, password: '!temporario', role: 'USER',
    sessoes: { create: { tokenHash: createHash('sha256').update(tokens[i]).digest('hex'), expiresAt: new Date(Date.now() + 600000) } },
  } });
  await prisma.cliente.create({ data: { id: clienteId, nome: 'Conversa de validação', telefone: phone, responsavelId: users[0] } });
  service = criarServicoMensagens({ prisma, client, conta, ativo: () => true });
  const incoming = { id: { _serialized: randomUUID() }, fromMe: false, from: lid, to: 'empresa', type: 'chat', body: 'Olá! Gostaria de um orçamento.', timestamp: Date.now() / 1000, ack: 0 };
  await service.receber(incoming);
  await service.receber(incoming);
  assert.equal(await prisma.mensagemWhatsApp.count({ where: { conta, externaId: incoming.id._serialized } }), 1);
  assert.equal((await prisma.cliente.findUnique({ where: { id: clienteId } })).responsavelId, users[0]);
  console.log('OK: recebimento por LID vinculado ao cadastro e vendedor existentes, sem duplicação.');
  const picture = { ...incoming, id: { _serialized: randomUUID() }, type: 'image', body: 'Referência', hasMedia: true, downloadMedia: async () => ({ data: png.toString('base64'), mimetype: 'image/png', filename: 'referencia.png' }) };
  await service.receber(picture);
  const savedPicture = await prisma.mensagemWhatsApp.findUnique({ where: { conta_externaId: { conta, externaId: picture.id._serialized } } });
  assert.equal((await prisma.midiaWhatsApp.findUnique({ where: { mensagemId: savedPicture.id } })).dados.length, png.length);
  const pedidoId = randomUUID();
  const texto = 'Olá! Como posso ajudar?';
  const conteudoHash = createHash('sha256').update(JSON.stringify([texto, undefined, undefined])).update('').digest('hex');
  const outgoing = await prisma.mensagemWhatsApp.create({ data: { clienteId, conta, pedidoId, conteudoHash, autorId: users[0], direcao: 'SAIDA', texto, status: 'PENDENTE' } });
  await service.enviarPendentes();
  await service.drain();
  await service.stop();
  assert.equal(sends, 1);
  assert.equal(await prisma.mensagemWhatsApp.count({ where: { conta, direcao: 'SAIDA' } }), 1);
  const sent = await prisma.mensagemWhatsApp.findUnique({ where: { id: outgoing.id } });
  await service.confirmar({ id: { _serialized: sent.externaId } }, 3);
  await service.confirmar({ id: { _serialized: sent.externaId } }, 2);
  assert.equal((await prisma.mensagemWhatsApp.findUnique({ where: { id: outgoing.id } })).status, 'LIDA');
  console.log('OK: envio com provedor simulado, eco sem duplicação e confirmação sem retrocesso.');

  service = criarServicoMensagens({ prisma, client, conta, ativo: () => true });
  shouldFail = true;
  const uncertain = await prisma.mensagemWhatsApp.create({ data: { clienteId, conta, autorId: users[0], direcao: 'SAIDA', texto: 'Teste de interrupção', status: 'PENDENTE' } });
  await service.enviarPendentes(); await service.enviarPendentes();
  assert.equal(sends, 2);
  assert.equal((await prisma.mensagemWhatsApp.findUnique({ where: { id: uncertain.id } })).status, 'INCERTO');
  console.log('OK: envio ambíguo não é repetido automaticamente.');

  shouldFail = false;
  const mediaOutgoing = await prisma.mensagemWhatsApp.create({ data: {
    clienteId, conta, autorId: users[0], direcao: 'SAIDA', texto: 'Imagem de teste', status: 'PENDENTE', tipo: 'image',
    midia: { create: { dados: png, mimeType: 'image/png', nome: 'teste.png' } },
  } });
  await service.enviarPendentes(); await service.drain();
  assert.equal((await prisma.mensagemWhatsApp.findUnique({ where: { id: mediaOutgoing.id } })).status, 'ENVIADA');
  const unauthorized = await prisma.mensagemWhatsApp.create({ data: { clienteId, conta, autorId: users[1], direcao: 'SAIDA', texto: 'Não deve sair', status: 'PENDENTE' } });
  await service.enviarPendentes();
  assert.equal(sends, 3);
  assert.equal((await prisma.mensagemWhatsApp.findUnique({ where: { id: unauthorized.id } })).status, 'FALHOU');
  console.log('OK: anexo enviado pelo provedor simulado e autorização conferida novamente antes do envio.');
  const voice = await prisma.mensagemWhatsApp.create({ data: {
    clienteId, conta, autorId: users[0], direcao: 'SAIDA', texto: '', status: 'PENDENTE', tipo: 'ptt',
    midia: { create: { dados: audioWebm(), mimeType: 'audio/webm', nome: 'audio.webm' } },
  } });
  await service.enviarPendentes(); await service.drain();
  assert.equal(lastOptions.sendAudioAsVoice, true);
  assert.equal(lastPayload.mimetype, 'audio/ogg; codecs=opus');
  assert.equal(Buffer.from(lastPayload.data, 'base64').subarray(0, 4).toString(), 'OggS');
  assert.equal((await prisma.mensagemWhatsApp.findUnique({ where: { id: voice.id } })).status, 'ENVIADA');
  console.log('OK: gravação enviada como mensagem de voz ao provedor simulado.');
  await prisma.cliente.update({ where: { id: clienteId }, data: { responsavelId: null } });
  const queueReply = await prisma.mensagemWhatsApp.create({ data: { clienteId, conta, autorId: users[1], direcao: 'SAIDA', texto: 'Resposta sem assumir', status: 'PENDENTE' } });
  await service.enviarPendentes(); await service.drain();
  assert.equal((await prisma.mensagemWhatsApp.findUnique({ where: { id: queueReply.id } })).status, 'ENVIADA');
  assert.equal((await prisma.cliente.findUnique({ where: { id: clienteId } })).responsavelId, null);
  await prisma.cliente.update({ where: { id: clienteId }, data: { responsavelId: users[0] } });
  console.log('OK: vendedor responde à fila sem assumir e sem alterar responsável.');

  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const pages = [];
  for (const token of tokens) {
    const context = await browser.createBrowserContext();
    await context.setCookie({ name: 'sessao_segura', value: token, domain: 'localhost', path: '/', httpOnly: true });
    const page = await context.newPage(); page.setDefaultTimeout(45000); pages.push(page);
    await page.goto('http://localhost:3000/atendimento', { waitUntil: 'networkidle2' });
  }
  const outsider = await pages[1].evaluate(async id => ({
    history: (await fetch(`/api/atendimento/${id}/mensagens`)).status,
    send: (await fetch(`/api/atendimento/${id}/mensagens`, { method: 'POST' })).status,
  }), clienteId);
  assert.deepEqual(outsider, { history: 403, send: 403 });
  assert.equal(await pages[1].evaluate(async id => (await fetch(`/api/atendimento/midia/${id}`)).status, savedPicture.id), 404);
  await pages[0].goto(`http://localhost:3000/atendimento/conversas/${clienteId}`, { waitUntil: 'networkidle2' });
  await pages[0].waitForFunction(() => document.body.innerText.includes('Gostaria de um orçamento.'));
  const duplicate = await pages[0].evaluate(async ({ id, pedidoId, texto }) => {
    const body = new FormData(); body.set('pedidoId', pedidoId); body.set('texto', texto);
    const r = await fetch(`/api/atendimento/${id}/mensagens`, { method: 'POST', body });
    return { status: r.status, data: await r.json() };
  }, { id: clienteId, pedidoId, texto });
  assert.equal(duplicate.status, 200); assert.equal(duplicate.data.id, outgoing.id);
  assert.equal(await prisma.mensagemWhatsApp.count({ where: { pedidoId } }), 1);
  const range = await pages[0].evaluate(async id => { const r = await fetch(`/api/atendimento/midia/${id}`, { headers: { Range: 'bytes=0-7' } }); return { status: r.status, size: (await r.arrayBuffer()).byteLength }; }, savedPicture.id);
  assert.deepEqual(range, { status: 206, size: 8 });
  if (process.env.TEST_SCREENSHOT_DIR) {
    await pages[0].setViewport({ width: 1440, height: 1000 });
    await pages[0].screenshot({ path: process.env.TEST_SCREENSHOT_DIR + '/conversa-desktop.png', fullPage: true });
    await pages[0].setViewport({ width: 390, height: 844 });
    await pages[0].screenshot({ path: process.env.TEST_SCREENSHOT_DIR + '/conversa-mobile.png', fullPage: true });
    assert.ok(await pages[0].evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  console.log('OK: histórico e anexos autenticados, envio idempotente e conversa no desktop/celular.');
  assert.equal(telefoneDoJid('123456789012345@lid'), null);
  assert.deepEqual(variantesTelefone('+5562991234567'), ['+5562991234567', '+556291234567']);
  assert.throws(() => validarMidia(Buffer.from('<script>'), 'image/png'));
} finally {
  await service?.stop(); await browser?.close();
  await prisma.mensagemWhatsApp.deleteMany({ where: { conta } });
  await prisma.identidadeWhatsApp.deleteMany({ where: { conta } });
  await prisma.cliente.deleteMany({ where: { id: clienteId } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
  console.log('Registros de validação removidos; nenhuma mensagem real foi enviada.');
}
