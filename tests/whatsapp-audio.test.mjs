import test from 'node:test';
import assert from 'node:assert/strict';
import { converterVoz } from '../scripts/whatsapp-audio.mjs';
import { audioWebm } from './fixtures/audio.mjs';

test('converte gravação WebM em Ogg Opus para mensagem de voz', async () => {
  const converted = await converterVoz(audioWebm());
  assert.equal(converted.subarray(0, 4).toString(), 'OggS');
  assert.ok(converted.subarray(0, 100).includes(Buffer.from('OpusHead')));
});
test('rejeita gravação inválida antes de transmitir', async () => {
  await assert.rejects(converterVoz(Buffer.from('áudio inválido')), /preparar o áudio/);
});
