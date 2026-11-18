import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ids = [randomUUID(), randomUUID()], clienteId = randomUUID(), pedidoId = randomUUID();
const tokens = ids.map(() => randomBytes(32).toString('hex'));
const texto = 'Resposta de teste sem assumir';
const conta = 'teste-' + randomUUID();
const outroClienteId = randomUUID(), outraMensagemId = randomUUID();
const conteudoHash = createHash('sha256').update(JSON.stringify([texto, undefined, undefined])).update('').digest('hex');
const call = (path, index = 0, body) => fetch(base + path, { headers: { Cookie: `sessao_segura=${tokens[index]}`, Origin: base }, ...(body ? { method: 'POST', body } : {}) });
try {
  for (let i = 0; i < 2; i++) await prisma.user.create({ data: { id: ids[i], role: i ? 'ADMIN' : 'USER', email: `${conta}-${i}@example.invalid`, password: 'temporario', sessoes: { create: { tokenHash: createHash('sha256').update(tokens[i]).digest('hex'), expiresAt: new Date(Date.now() + 300000) } } } });
  await prisma.cliente.create({ data: { id: clienteId, nome: 'Teste de resposta na fila' } });
  // An existing simulated send exercises HTTP authorization/idempotency without contacting anyone.
  await prisma.mensagemWhatsApp.create({ data: { clienteId, conta, pedidoId, conteudoHash, autorId: ids[0], direcao: 'SAIDA', texto, status: 'ENVIADA' } });
  const response = await call(`/api/atendimento/${clienteId}/mensagens`);
  assert.equal(response.status, 200); assert.equal((await response.json()).podeEnviar, true);
  const form = new FormData(); form.set('pedidoId', pedidoId); form.set('texto', texto);
  assert.equal((await call(`/api/atendimento/${clienteId}/mensagens`, 0, form)).status, 200);
  assert.equal((await prisma.cliente.findUnique({ where: { id: clienteId } })).responsavelId, null);
  const status = await call('/api/whatsapp/status', 1);
  assert.equal(status.status, 200); const estado = await status.json(); assert.equal(estado.status, 'conectado');
  await prisma.cliente.create({ data: { id: outroClienteId, nome: 'Teste de citação restrita', responsavelId: ids[1] } });
  await prisma.mensagemWhatsApp.create({ data: { id: outraMensagemId, clienteId: outroClienteId, conta: estado.numero, externaId: randomUUID(), direcao: 'ENTRADA', texto: 'Mensagem de outro cliente', status: 'RECEBIDA' } });
  assert.equal((await call(`/api/atendimento/${clienteId}/mensagens?citadaPor=${outraMensagemId}`)).status, 404);
  const quote = new FormData(); quote.set('pedidoId', randomUUID()); quote.set('texto', 'Resposta inválida'); quote.set('responderId', outraMensagemId);
  assert.equal((await call(`/api/atendimento/${clienteId}/mensagens`, 0, quote)).status, 400);
  form.set('responderId', outraMensagemId);
  assert.equal((await call(`/api/atendimento/${clienteId}/mensagens`, 0, form)).status, 409);
  assert.equal(await prisma.mensagemWhatsApp.count({ where: { pedidoId: String(quote.get('pedidoId')) } }), 0);
  console.log('OK: citação de outro cliente rejeitada e idempotência distingue a mensagem citada.');
  await prisma.cliente.update({ where: { id: clienteId }, data: { responsavelId: ids[1] } });
  assert.equal((await call(`/api/atendimento/${clienteId}/mensagens`)).status, 403);
  assert.equal((await call(`/api/atendimento/${clienteId}/mensagens`, 0, form)).status, 403);
  console.log('OK: resposta HTTP sem assumir, responsável preservado, status disponível e carteira de outro vendedor protegida.');
} finally {
  await prisma.mensagemWhatsApp.deleteMany({ where: { conta } });
  await prisma.mensagemWhatsApp.deleteMany({ where: { id: outraMensagemId } });
  await prisma.cliente.deleteMany({ where: { id: outroClienteId } });
  await prisma.cliente.deleteMany({ where: { id: clienteId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
}
