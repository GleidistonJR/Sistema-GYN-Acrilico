import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTelefone, podeEditarCliente, filtroClientes, validarTexto } from '../lib/atendimento/regras.ts';

test('telefones com a mesma formatação internacional produzem uma única identidade', () => {
  assert.equal(normalizarTelefone('+55 (62) 99999-1234'), '+5562999991234');
  assert.equal(normalizarTelefone('5562999991234'), '+5562999991234');
  for (const entrada of ['', 'abc5562999991234', '+012345678', '123', '1234567890123456', null]) {
    assert.throws(() => normalizarTelefone(entrada));
  }
});

test('um vendedor não pode editar clientes de outro vendedor nem da fila', () => {
  const vendedor = { id: 'vendedor-a', role: 'USER' };
  assert.equal(podeEditarCliente(vendedor, 'vendedor-a'), true);
  assert.equal(podeEditarCliente(vendedor, 'vendedor-b'), false);
  assert.equal(podeEditarCliente(vendedor, null), false);
  assert.equal(podeEditarCliente({ ...vendedor, role: 'OUTRO' }, vendedor.id), false);
  assert.equal(podeEditarCliente({ id: 'admin', role: 'ADMIN' }, 'vendedor-b'), true);
});

test('alterar o filtro para todos não expõe outras carteiras a um vendedor', () => {
  const vendedor = { id: 'vendedor-a', role: 'USER' };
  assert.deepEqual(filtroClientes(vendedor, 'todos'), { responsavelId: vendedor.id });
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
