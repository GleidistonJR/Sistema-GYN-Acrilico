import test from 'node:test';
import assert from 'node:assert/strict';
import { criarFotosContatos, urlFotoSegura } from '../scripts/whatsapp-fotos.mjs';

test('aceita apenas CDN HTTPS de fotos, rejeita hosts parecidos e credenciais', () => {
  assert.equal(urlFotoSegura('https://pps.whatsapp.net/test'), 'https://pps.whatsapp.net/test');
  for (const value of ['http://pps.whatsapp.net/test', 'https://whatsapp.net.evil.test/a', 'https://user@pps.whatsapp.net/a', 'data:image/png,x', undefined]) assert.equal(urlFotoSegura(value), null);
});

test('foto privada é cacheada e chamadas simultâneas não duplicam consulta', async () => {
  let reads = 0, calls = 0, writes = 0;
  const prisma = {
    async $queryRaw() { return reads++ === 0 ? [{ clienteId: 'teste', telefone: '+5562999999999' }] : []; },
    async $executeRaw(strings, ...values) { writes++; assert.equal(values[0], null); assert.equal(values[1], 0); },
  };
  const service = criarFotosContatos({ prisma, ativo: () => true, client: { async getProfilePicUrl(id) { calls++; assert.equal(id, '5562999999999@c.us'); return undefined; } } });
  await Promise.all([service.acordar(), service.acordar()]);
  assert.equal(calls, 1); assert.equal(writes, 1);
  service.stop(); await service.acordar(); assert.equal(reads, 2);
});
