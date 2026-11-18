import test from 'node:test';
import assert from 'node:assert/strict';
import { converterVoz } from '../scripts/whatsapp-audio.mjs';
import { audioWebm } from './fixtures/audio.mjs';

test('converte gravação WebM em MP3 mono para reprodução multiplataforma', async () => {
  const converted = await converterVoz(audioWebm());
  assert.equal(converted.subarray(0, 3).toString(), 'ID3');
});
test('rejeita gravação inválida antes de transmitir', async () => {
  await assert.rejects(converterVoz(Buffer.from('áudio inválido')), /preparar o áudio/);
});
