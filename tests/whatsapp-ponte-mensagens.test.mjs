import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { instalarPonteMensagens } from '../scripts/whatsapp-ponte-mensagens.mjs';

test('restaura eventos ausentes, sem duplicação; acompanha descriptografia e confirmação', async () => {
  const original = globalThis.window;
  const msg = new EventEmitter(), received = [], acks = [];
  const recent = { id: { _serialized: 'recente' }, isNewMsg: true, type: 'chat', t: Date.now() / 1000 };
  msg.getModelsArray = () => [recent, { ...recent, id: { _serialized: 'antiga' }, t: 1 }];
  globalThis.window = { require: () => ({ Msg: msg }), WWebJS: { getMessageModel: m => m }, onAddMessageEvent: m => received.push(m.id._serialized), onMessageAckEvent: (m, ack) => acks.push(ack) };
  try {
    assert.equal(instalarPonteMensagens().nova, true);
    assert.deepEqual(received, ['recente']);
    instalarPonteMensagens(); assert.equal(msg.listenerCount('add'), 1);
    const encrypted = { ...recent, id: { _serialized: 'nova' }, type: 'ciphertext' };
    msg.emit('add', encrypted); assert.equal(received.length, 1);
    encrypted.type = 'chat'; msg.emit('change:type', encrypted); msg.emit('add', encrypted);
    assert.deepEqual(received, ['recente', 'nova']);
    msg.emit('change:ack', encrypted, 3); assert.deepEqual(acks, [3]);
    msg.removeAllListeners();
    msg.getModelsArray = () => [recent, { ...recent, id: { _serialized: 'perdida-no-reset' } }];
    instalarPonteMensagens();
    assert.equal(received.at(-1), 'perdida-no-reset');
    msg.emit('add', { ...recent, id: { _serialized: 'depois-reset' } });
    assert.equal(received.at(-1), 'depois-reset');
    const next = new EventEmitter(); next.getModelsArray = () => [];
    window.require = () => ({ Msg: next }); instalarPonteMensagens();
    assert.equal(msg.listenerCount('add'), 0); assert.equal(next.listenerCount('add'), 1);
  } finally { globalThis.window = original; }
});

test('não declara recebimento pronto se a comunicação com Node estiver ausente', () => {
  const original = globalThis.window;
  globalThis.window = { require: () => ({ Msg: new EventEmitter() }) };
  try { assert.throws(instalarPonteMensagens, /ainda não estão disponíveis/); }
  finally { globalThis.window = original; }
});
