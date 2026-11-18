import test from 'node:test';
import assert from 'node:assert/strict';
import { validarMidia, LIMITE_MIDIA } from '../lib/whatsapp/conteudo.mjs';

test('aceita vídeos MP4/WebM e PDF maior que 10 MB; rejeita conteúdo disfarçado e excesso', () => {
  const mp4 = Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]);
  assert.equal(validarMidia(mp4, 'video/mp4'), 'video/mp4');
  assert.equal(validarMidia(Buffer.from([26,69,223,163,0]), 'video/webm'), 'video/webm');
  const pdf = Buffer.alloc(11 * 1024 * 1024); pdf.write('%PDF-1.4');
  assert.equal(validarMidia(pdf, 'application/pdf'), 'application/pdf');
  assert.throws(() => validarMidia(Buffer.from('<html>'), 'video/mp4'));
  assert.throws(() => validarMidia(Buffer.alloc(LIMITE_MIDIA + 1), 'application/pdf'));
});
