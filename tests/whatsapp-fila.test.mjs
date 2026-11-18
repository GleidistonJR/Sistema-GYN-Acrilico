import test from 'node:test';
import assert from 'node:assert/strict';
import { criarFilaPrioritaria } from '../scripts/whatsapp-fila.mjs';

test('envio ultrapassa histórico pendente sem executar operações simultâneas', async () => {
  const fila = criarFilaPrioritaria(), order = [];
  let release;
  const busy = fila.enqueue(() => new Promise(resolve => { release = resolve; }));
  const history = fila.enqueue(() => order.push('historico'), 2);
  const receive = fila.enqueue(() => order.push('recebida'), 1);
  const send = fila.enqueue(() => order.push('envio'), 0);
  assert.deepEqual(order, []);
  release(); await Promise.all([busy, history, receive, send]); await fila.drain();
  assert.deepEqual(order, ['envio', 'recebida', 'historico']);
});

test('erro não interrompe fila e sequência de envios dá espaço ao recebimento', async () => {
  const fila = criarFilaPrioritaria(), order = [];
  let release;
  const busy = fila.enqueue(() => new Promise(resolve => { release = resolve; }));
  const jobs = Array.from({ length: 8 }, (_, i) => fila.enqueue(() => { order.push(i); if (i === 0) throw new Error('teste'); }, 0));
  jobs.push(fila.enqueue(() => order.push('recebida')));
  const all = Promise.allSettled(jobs); release(); await busy; await all; await fila.drain();
  assert.ok(order.indexOf('recebida') <= 4);
  assert.equal(order.length, 9);
});
