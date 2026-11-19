import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTelefone, filtroClientes, validarTexto } from '../lib/atendimento/regras.ts';

test('normaliza WhatsApp brasileiro com DDD e aceita o +55 ao colar', () => {
  assert.equal(normalizarTelefone('(62) 99999-1234'), '+5562999991234');
  assert.equal(normalizarTelefone('62 3333-1234'), '+556233331234');
  assert.equal(normalizarTelefone('55 99999-1234'), '+5555999991234');
  assert.equal(normalizarTelefone('+55 (62) 99999-1234'), '+5562999991234');
  assert.equal(normalizarTelefone('5562999991234'), '+5562999991234');
  for (const entrada of ['', 'abc5562999991234', '+012345678', '999991234', '+1 202 555 0123', '+62999991234', '1234567890123456', null]) {
    assert.throws(() => normalizarTelefone(entrada));
  }
});

test('todos mostra a equipe e meus mantém apenas a carteira do vendedor', () => {
  const vendedor = { id: 'vendedor-a', role: 'USER' };
  assert.deepEqual(filtroClientes(vendedor, 'todos'), {});
  assert.deepEqual(filtroClientes(vendedor, 'invalido'), { responsavelId: vendedor.id });
  assert.deepEqual(filtroClientes(vendedor, 'fila'), { responsavelId: null });
  assert.deepEqual(filtroClientes({ id: 'admin', role: 'ADMIN' }, 'todos'), {});
});

test('nomes vazios e extensos não entram no cadastro', () => {
  assert.equal(validarTexto('  Cliente  ', 120), 'Cliente');
  assert.throws(() => validarTexto('  ', 120));
  assert.throws(() => validarTexto('a'.repeat(121), 120));
  assert.throws(() => validarTexto(null, 120));
});
