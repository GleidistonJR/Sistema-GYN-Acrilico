import test from 'node:test';
import assert from 'node:assert/strict';
import { validarApelido, apelidoEfetivo, assinarMensagem } from '../lib/whatsapp/assinatura.mjs';
test('apelido valida formato sem permitir injeção de cabeçalho WhatsApp', () => {
  assert.equal(validarApelido('  João  Júnior '), 'João Júnior');
  for (const value of ['', '*Junior*', 'Junior\nOutro', 'x'.repeat(41), '<script>', 'Junior:']) assert.throws(() => validarApelido(value));
});
test('assinatura preserva corpo e formatação, identifica texto/legendas e mantém áudio', () => {
  assert.equal(assinarMensagem('Mensagem normal\n*Detalhe*', 'Junior'), '*Junior:*\nMensagem normal\n*Detalhe*');
  assert.equal(assinarMensagem('', 'Claudia', 'image/jpeg'), '*Claudia:*');
  assert.equal(assinarMensagem('Orçamento', 'Junior', 'application/pdf'), '*Junior:*\nOrçamento');
  assert.equal(assinarMensagem('', 'Junior', 'audio/mpeg'), '');
  assert.equal(apelidoEfetivo({ apelido: 'Junior', colaborador: { nome: 'Outro nome' } }), 'Junior');
  assert.equal(apelidoEfetivo({ colaborador: { nome: 'Claudia Silva' } }), 'Claudia');
  assert.equal(apelidoEfetivo({}), 'Atendimento');
});
