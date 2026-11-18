import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { caminhoArquivo } from '../scripts/whatsapp-arquivos.mjs';
if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const userId = randomUUID(), otherId = randomUUID(), clienteId = randomUUID();
const token = randomBytes(32).toString('hex'), otherToken = randomBytes(32).toString('hex');
const hash = value => createHash('sha256').update(value).digest('hex');
const headers = { Cookie: `sessao_segura=${token}`, Origin: base };
const files = [], tickets = [];
try {
  for (const [id, secret] of [[userId, token], [otherId, otherToken]]) await db.user.create({ data: { id, email: `${id}@example.invalid`, password: 'teste', role: id === userId ? 'USER' : 'OUTRO', sessoes: { create: { tokenHash: hash(secret), expiresAt: new Date(Date.now() + 3600000) } } } });
  // No phone and no WhatsApp identity: this fixture cannot contact a real customer.
  await db.cliente.create({ data: { id: clienteId, nome: 'Teste transferência sem destinatário', responsavelId: userId } });
  for (const size of [2048, 12 * 1024 * 1024]) {
    const data = Buffer.alloc(size, 32); data.write('%PDF-1.4\n');
    const grant = await fetch(`${base}/api/atendimento/${clienteId}/anexos`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'teste.pdf', mimeType: 'application/pdf', tamanho: size }) });
    const ticket = await grant.json(); assert.equal(grant.status, 200, ticket.erro); tickets.push(hash(ticket.token));
    const [stored] = await db.$queryRaw`SELECT payload FROM "TransferenciaWhatsApp" WHERE "tokenHash" = ${hash(ticket.token)}`;
    files.push(stored.payload.chave);
    const invalid = await fetch(ticket.url.replace(ticket.token, '0'.repeat(64)), { method: 'PUT', body: 'invalid' }); assert.equal(invalid.status, 403);
    const wrongOrigin = await fetch(ticket.url, { method: 'OPTIONS', headers: { Origin: 'https://example.invalid' } }); assert.equal(wrongOrigin.status, 403);
    const preflight = await fetch(ticket.url, { method: 'OPTIONS', headers: { Origin: base, 'Access-Control-Request-Method': 'PUT' } }); assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), base);
    const upload = await fetch(ticket.url, { method: 'PUT', headers: { Origin: base, 'Content-Type': 'application/octet-stream' }, body: data }); assert.equal(upload.status, 200, await upload.text());
    const form = new FormData(); form.set('pedidoId', randomUUID()); form.set('texto', 'Legenda de teste'); form.set('uploadToken', ticket.token);
    const post = await fetch(`${base}/api/atendimento/${clienteId}/mensagens`, { method: 'POST', headers, body: form });
    const sent = await post.json(); assert.equal(post.status, 202, sent.erro);
    const media = await db.midiaWhatsApp.findUnique({ where: { mensagemId: sent.id } }); assert.equal(media.dados.length, 0);
    const repeated = await fetch(`${base}/api/atendimento/${clienteId}/mensagens`, { method: 'POST', headers, body: form }); assert.equal((await repeated.json()).id, sent.id);
    const denied = await fetch(`${base}/api/atendimento/midia/${sent.id}?link=1`, { headers: { Cookie: `sessao_segura=${otherToken}` } }); assert.equal(denied.status, 404);
    const linkResponse = await fetch(`${base}/api/atendimento/midia/${sent.id}?link=1`, { headers });
    const link = await linkResponse.json(); assert.equal(linkResponse.status, 200, link.erro);
    tickets.push(hash(new URL(link.url).searchParams.get('token')));
    const ranged = await fetch(link.url, { headers: { Origin: base, Range: 'bytes=0-15' } }); assert.equal(ranged.status, 206); assert.equal((await ranged.text()).slice(0, 8), '%PDF-1.4');
    const full = await fetch(link.url, { headers: { Origin: base } }); assert.equal(hash(Buffer.from(await full.arrayBuffer())), hash(data));
    const invalidRange = await fetch(link.url, { headers: { Range: `bytes=${size}-` } }); assert.equal(invalidRange.status, 416);
    await db.cliente.update({ where: { id: clienteId }, data: { responsavelId: otherId } });
    const sharedRange = await fetch(link.url, { headers: { Range: 'bytes=0-0' } });
    assert.equal(sharedRange.status, 206); await sharedRange.arrayBuffer();
    await db.cliente.update({ where: { id: clienteId }, data: { responsavelId: userId } });
    console.log(`OK: PDF ${size} bytes, upload direto, legenda, retry, download completo/Range, acesso por papel e atribuição sem bloquear acesso; zero bytes de conteúdo no Neon.`);
  }
} finally {
  for (const key of tickets) await db.$executeRaw`DELETE FROM "TransferenciaWhatsApp" WHERE "tokenHash" = ${key}`;
  await db.cliente.deleteMany({ where: { id: clienteId } });
  await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  for (const key of files) await unlink(caminhoArquivo(key)).catch(() => {});
  await db.$disconnect();
}
