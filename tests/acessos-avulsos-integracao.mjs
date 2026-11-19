import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { vinculoColaboradorTeste } from './fixtures/colaborador.mjs';
import { criarServicoMensagens } from '../scripts/whatsapp-mensagens.mjs';
import { emitirTransferencia, hashToken, lerTransferencia } from '../lib/whatsapp/transferencia.mjs';

if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1.');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const db = new PrismaClient();
const adminId = randomUUID();
const adminToken = randomBytes(32).toString('hex');
const emails = Array.from({ length: 3 }, () => randomUUID() + '@example.invalid');
const clienteId = randomUUID();
const contaWhatsApp = 'recepcao-teste-' + randomUUID();
const senha = randomUUID();
let browser;
let servico;
let ticket;

const consultar = (rota, token) => fetch(base + rota, {
  redirect: 'manual',
  headers: { Cookie: 'sessao_segura=' + token },
});
async function bloquear(rota, token) {
  const resposta = await consultar(rota, token);
  assert.equal(resposta.status, 307, rota);
  assert.equal(new URL(resposta.headers.get('location'), base).pathname, '/login');
}

try {
  const administrador = await db.user.create({ data: {
    id: adminId, email: adminId + '@example.invalid', password: '!teste', role: 'ADMIN',
    colaborador: vinculoColaboradorTeste(adminId),
    sessoes: { create: { tokenHash: createHash('sha256').update(adminToken).digest('hex'), expiresAt: new Date(Date.now() + 600000) } },
  }, select: { colaborador: { select: { id: true } } } });
  const perfil = '/administracao/colaboradores/' + administrador.colaborador.id;
  await bloquear('/baterPonto', adminToken);
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  await browser.defaultBrowserContext().setCookie({ name: 'sessao_segura', value: adminToken, url: base, httpOnly: true });
  const admin = await browser.newPage();
  await admin.goto(base + '/administracao/acessos', { waitUntil: 'networkidle0' });

  async function criar(email, role) {
    await admin.bringToFront();
    await admin.locator('form input[name="email"]').fill(email);
    await admin.locator('form input[name="senha"]').fill(senha);
    await admin.select('form select[name="role"]', role);
    await admin.locator('form button[type="submit"]').click();
    await admin.waitForSelector(`button[aria-label="Revogar acesso de ${email}"]`);
    const conta = await db.user.findUnique({ where: { email }, select: { role: true, colaborador: { select: { id: true } } } });
    assert.deepEqual(conta, { role, colaborador: null });
  }

  async function entrar(email, destino) {
    const contexto = await browser.createBrowserContext();
    const page = await contexto.newPage();
    await page.goto(base + '/login', { waitUntil: 'networkidle0' });
    await page.locator('form input[type="text"]').fill(email);
    await page.locator('form input[type="password"]').fill(senha);
    await page.locator('form button[type="submit"]').click();
    await page.waitForFunction(caminho => location.pathname === caminho, {}, destino);
    const cookie = (await contexto.cookies()).find(item => item.name === 'sessao_segura');
    assert.ok(cookie);
    await contexto.close();
    return cookie.value;
  }

  await criar(emails[0], 'PONTO');
  await criar(emails[1], 'COMERCIAL');
  await criar(emails[2], 'RECEPCAO');
  const ponto = await entrar(emails[0], '/baterPonto');
  const comercial = await entrar(emails[1], '/orcamentos');
  assert.equal((await consultar('/relatorioPontos', ponto)).status, 200);
  for (const rota of ['/orcamentos', '/materiais', '/produtos', '/atendimento', '/administracao/acessos', perfil]) await bloquear(rota, ponto);
  for (const rota of ['/orcamentos', '/materiais', '/produtos', '/api/textos-rapidos']) assert.equal((await consultar(rota, comercial)).status, 200, rota);
  for (const rota of ['/baterPonto', '/relatorioPontos', '/atendimento', '/administracao/acessos', perfil]) await bloquear(rota, comercial);
  assert.equal((await consultar('/api/atendimento/clientes', comercial)).status, 401);

  const recepcao = await entrar(emails[2], '/atendimento');
  const segundaSessao = await entrar(emails[2], '/atendimento');
  assert.notEqual(segundaSessao, recepcao);
  for (const rota of ['/atendimento', '/orcamentos', '/materiais', '/produtos', '/api/atendimento/clientes']) {
    assert.equal((await consultar(rota, recepcao)).status, 200, rota);
  }
  for (const rota of ['/baterPonto', '/relatorioPontos', '/administracao/acessos', '/atendimento/conexao', perfil]) {
    await bloquear(rota, recepcao);
  }
  const { id: responsavelId } = await db.user.findUniqueOrThrow({ where: { email: emails[2] }, select: { id: true } });
  await db.cliente.create({ data: { id: clienteId, nome: 'Recepção em teste', responsavelId } });
  assert.equal((await consultar(`/api/atendimento/${clienteId}/mensagens`, segundaSessao)).status, 200);
  ticket = await emitirTransferencia(db, { acao: 'upload', clienteId, userId: responsavelId, sessionHash: hashToken(recepcao) });
  assert.ok(await lerTransferencia(db, ticket), 'A recepção pode transferir anexos.');
  const jid = '12345@c.us';
  await db.identidadeWhatsApp.create({ data: { conta: contaWhatsApp, jid, clienteId } });
  const pendente = await db.mensagemWhatsApp.create({ data: {
    conta: contaWhatsApp, clienteId, autorId: responsavelId, direcao: 'SAIDA', status: 'PENDENTE', texto: 'Envio simulado',
  } });
  const client = new EventEmitter();
  client.sendMessage = async () => ({ id: { _serialized: randomUUID() }, ack: 1 });
  servico = criarServicoMensagens({ prisma: db, client, conta: contaWhatsApp, ativo: () => true });
  await servico.enviarPendentes();
  assert.equal((await db.mensagemWhatsApp.findUniqueOrThrow({ where: { id: pendente.id } })).status, 'ENVIADA');

  await admin.bringToFront();
  admin.once('dialog', dialog => void dialog.accept());
  await admin.click(`button[aria-label="Revogar acesso de ${emails[0]}"]`);
  await admin.waitForSelector(`button[aria-label="Revogar acesso de ${emails[0]}"]`, { hidden: true });
  await bloquear('/baterPonto', ponto);
  assert.equal(await db.user.count({ where: { email: emails[0] } }), 0);
  console.log('Criação, login com destino por perfil, bloqueio por rota/API e revogação de acesso avulso verificados.');
} finally {
  await browser?.close();
  await servico?.stop();
  if (ticket) await db.transferenciaWhatsApp.deleteMany({ where: { tokenHash: hashToken(ticket) } });
  await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.colaborador.deleteMany({ where: { userId: adminId } });
  await db.$disconnect();
}
