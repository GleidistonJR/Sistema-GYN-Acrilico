import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PrismaClient } from '@prisma/client';
import { criarServicoMensagens } from '../scripts/whatsapp-mensagens.mjs';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient(), clienteId = randomUUID(), conta = 'teste-' + randomUUID();
const jid = '999' + Date.now() + '@c.us';
let service, attempts = 0;
try {
  await db.cliente.create({ data: { id: clienteId, nome: 'Teste de recebimento resiliente' } });
  await db.identidadeWhatsApp.create({ data: { clienteId, conta, jid } });
  const proxy = new Proxy(db, { get(target, key) {
    if (key === '$transaction') return async operations => {
      assert.ok(Array.isArray(operations), 'Recebimento não deve usar transação interativa de cinco segundos');
      attempts++;
      if (attempts <= 2) throw Object.assign(new Error('Falha transitória simulada'), { code: 'P2028' });
      // Real atomic DB transaction lasting longer than the old five-second deadline.
      return db.$transaction([db.$queryRaw`SELECT pg_sleep(6)::text`, ...operations]);
    };
    return Reflect.get(target, key);
  } });
  const client = new EventEmitter();
  service = criarServicoMensagens({ prisma: proxy, client, conta, ativo: () => true, retryDelayMs: 100 });
  const message = { id: { _serialized: randomUUID() }, fromMe: false, from: jid, type: 'chat', body: 'Recebida mesmo com falha temporária', timestamp: Date.now() / 1000, ack: 0 };
  const before = Date.now(); client.emit('message_create', message); client.emit('message_create', message);
  while (!await db.mensagemWhatsApp.count({ where: { conta } })) {
    assert.ok(Date.now() - before < 30000, 'Mensagem não foi recuperada automaticamente');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await service.drain();
  assert.equal(attempts, 3);
  assert.ok(Date.now() - before > 5000);
  await service.receber(message);
  assert.equal(await db.mensagemWhatsApp.count({ where: { conta } }), 1);
  const customer = await db.cliente.findUnique({ where: { id: clienteId } });
  assert.equal(customer.versaoEntrada, 1n);
  console.log('OK: duas falhas transitórias recuperadas automaticamente, transação de mais de seis segundos confirmada, mensagem e contador únicos.');
} finally {
  await service?.stop();
  await db.mensagemWhatsApp.deleteMany({ where: { conta } });
  await db.identidadeWhatsApp.deleteMany({ where: { conta } });
  await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.$disconnect();
}
