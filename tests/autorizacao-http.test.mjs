import test from 'node:test';
import assert from 'node:assert/strict';

// Run with the local server running. These checks do not log in or mutate data.
const origem = 'http://127.0.0.1:3000';
for (const rota of ['/atendimento', '/administracao', '/produtos', '/administracao/colaboradores/1']) {
  test(`${rota} recusa cookie legado mesmo com papel ADMIN`, async () => {
    const resposta = await fetch(origem + rota, {
      redirect: 'manual',
      headers: { cookie: 'sessao_admin=' + encodeURIComponent(JSON.stringify({ role: 'ADMIN', userId: 1 })) },
    });
    assert.equal(resposta.status, 307);
    assert.equal(new URL(resposta.headers.get('location'), origem).pathname, '/login');
  });
}
