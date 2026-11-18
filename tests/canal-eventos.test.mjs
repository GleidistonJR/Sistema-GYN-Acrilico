import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { criarCanalEventos } from '../lib/whatsapp/canal-eventos.mjs';

test('compartilha LISTEN, agrupa eventos sem conteúdo e fecha última assinatura', async () => {
  let connects = 0, ends = 0;
  const db = new EventEmitter();
  db.connect = async () => { connects++; };
  db.query = async query => assert.equal(query, 'LISTEN atendimento_alterado');
  db.end = async () => { ends++; db.emit('end'); };
  const hub = criarCanalEventos({ criarConexao: () => db });
  const a = [], b = [];
  const offA = hub.observar(event => a.push(event));
  const offB = hub.observar(event => b.push(event));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(connects, 1); assert.deepEqual(a, ['pronto']);
  for (let i = 0; i < 5; i++) db.emit('notification', { channel: 'atendimento_alterado', payload: 'conteudo privado' });
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.deepEqual(a, ['pronto', 'atualizar']); assert.deepEqual(b, a);
  offA(); assert.equal(ends, 0); offB(); assert.equal(ends, 1);
});

test('perda de conexão avisa consumidores, permitindo fallback e reconexão', async () => {
  const db = new EventEmitter(); db.connect = async () => {}; db.query = async () => {}; db.end = async () => {};
  const events = [];
  const off = criarCanalEventos({ criarConexao: () => db }).observar(event => events.push(event));
  await new Promise(resolve => setTimeout(resolve, 0));
  db.emit('error', new Error('offline'));
  assert.deepEqual(events, ['pronto', 'erro']); off();
});
