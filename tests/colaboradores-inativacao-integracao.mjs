import assert from 'node:assert/strict';
import { randomBytes, randomInt, randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { vinculoColaboradorTeste } from './fixtures/colaborador.mjs';

if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1.');
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const adminId = randomUUID();
const exclusaoId = randomUUID();
const adminToken = randomBytes(32).toString('hex');
const nome = 'Teste de inativação ' + randomUUID();
const email = randomUUID() + '@example.invalid';
const cpf = String(randomInt(10_000_000_000, 100_000_000_000));
const senha = randomUUID();
const sessao = token => ({
  create: { tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) },
});
let browser;

try {
  await db.user.create({ data: {
    id: adminId, email: adminId + '@example.invalid', password: '!teste', role: 'ADMIN',
    colaborador: vinculoColaboradorTeste(adminId), sessoes: sessao(adminToken),
  } });
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  await browser.defaultBrowserContext().setCookie({ name: 'sessao_segura', value: adminToken, url: base, httpOnly: true });
  const admin = await browser.newPage();
  const endereco = base + '/administracao/colaboradores';
  const filtro = 'select[aria-label="Situação do colaborador"]';
  const modal = 'dialog[open]';
  await admin.setViewport({ width: 390, height: 820 });
  await admin.goto(endereco, { waitUntil: 'domcontentloaded' });
  assert.equal(await admin.$eval(filtro, el => el.value), 'ativos');
  await admin.locator('::-p-text(Adicionar colaborador)').click();
  await admin.locator(modal + ' input[name="nome"]').fill(nome);
  await admin.locator(modal + ' input[name="cargo"]').fill('Teste');
  await admin.type(modal + ' input[inputmode="numeric"]', cpf);
  await admin.locator(modal + ' input[name="email"]').fill(email);
  await admin.locator(modal + ' input[name="senha"]').fill(senha);
  await admin.locator(modal + ' button[type="submit"]').click();
  await admin.waitForSelector(modal, { hidden: true });
  const colaborador = await db.colaborador.findUnique({ where: { cpf }, select: { id: true, userId: true } });
  assert.ok(colaborador?.userId);
  const ponto = await browser.newPage();
  async function baterPonto() {
    await ponto.bringToFront();
    await ponto.goto(base + '/baterPonto', { waitUntil: 'networkidle0' });
    await ponto.type('input[placeholder="000.000.000-00"]', cpf);
    await ponto.locator('main section button').click();
  }
  await baterPonto();
  await ponto.waitForFunction(() => location.pathname === '/relatorioPontos');
  assert.equal(await db.ponto.count({ where: { cpf } }), 1);

  const contexto = await browser.createBrowserContext();
  const usuario = await contexto.newPage();
  async function entrar() {
    await usuario.goto(base + '/login', { waitUntil: 'domcontentloaded' });
    await usuario.locator('form input[type="text"]').fill(email);
    await usuario.locator('form input[type="password"]').fill(senha);
    await usuario.locator('form button[type="submit"]').click();
  }
  await entrar();
  await usuario.waitForFunction(id => location.pathname === '/administracao/colaboradores/' + id, {}, colaborador.id);
  const acesso = () => usuario.evaluate(async url => (await fetch(url)).status, base + '/api/atendimento/clientes');
  assert.equal(await acesso(), 200);

  await admin.bringToFront();
  await admin.waitForSelector(`button[aria-label="Inativar ${nome}"]`);
  admin.once('dialog', dialog => void dialog.accept());
  await admin.click(`button[aria-label="Inativar ${nome}"]`);
  await admin.waitForFunction(() => document.body.innerText.includes('Colaborador inativado e acesso revogado.'));
  await admin.waitForSelector(`a[aria-label="Histórico de ${nome}"]`, { hidden: true });
  assert.equal(await db.user.count({ where: { id: colaborador.userId } }), 0);
  assert.equal(await db.sessao.count({ where: { userId: colaborador.userId } }), 0);
  assert.equal(await db.ponto.count({ where: { cpf } }), 1);
  await baterPonto();
  await ponto.waitForFunction(() => document.body.innerText.includes('CPF não cadastrado ou colaborador inativo.'));
  assert.equal(await db.ponto.count({ where: { cpf } }), 1);

  await admin.bringToFront();
  await admin.select(filtro, 'inativos');
  await admin.waitForSelector(`a[aria-label="Histórico de ${nome}"]`);
  await admin.select(filtro, 'todos');
  await admin.locator(`a[aria-label="Histórico de ${nome}"]`).click();
  await admin.waitForFunction(() => document.body.innerText.includes('Inativo desde'));

  await usuario.bringToFront();
  assert.equal(await acesso(), 401);
  await entrar();
  await usuario.waitForFunction(() => document.body.innerText.includes('Usuário ou senha incorretos'));

  await assert.rejects(db.user.create({ data: { email: exclusaoId + '@example.invalid', password: '!teste' } }));
  await db.user.create({ data: {
    id: exclusaoId, email: exclusaoId + '@example.invalid', password: '!teste',
    colaborador: vinculoColaboradorTeste(exclusaoId), sessoes: sessao(randomBytes(32).toString('hex')),
  } });
  await db.colaborador.delete({ where: { userId: exclusaoId } });
  assert.equal(await db.user.count({ where: { id: exclusaoId } }), 0);
  assert.equal(await db.sessao.count({ where: { userId: exclusaoId } }), 0);
  console.log('Cadastro com login vinculado, inativação, filtros, histórico, ponto, revogação e exclusão verificados.');
} finally {
  await browser?.close();
  await db.colaborador.deleteMany({ where: { OR: [{ cpf }, { userId: { in: [adminId, exclusaoId] } }] } });
  await db.$disconnect();
}
