import test from 'node:test';
import assert from 'node:assert/strict';
import { obterCitacao, resumoCitacao } from '../lib/whatsapp/citacao.mjs';
import { WhatsAppClient } from '../scripts/whatsapp-client.mjs';

test('citação guarda apenas resumo limitado, sem copiar anexo', () => {
  const quote = resumoCitacao({ id: { _serialized: 'origem' }, body: 'x'.repeat(4000), type: 'image', fromMe: true, media: 'não copiar' });
  assert.equal(quote.texto.length, 1000);
  assert.equal(quote.direcao, 'SAIDA');
  assert.equal(quote.externaId, 'origem');
  assert.equal('media' in quote, false);
});
test('citação indisponível não impede receber a resposta', async () => {
  assert.equal(await obterCitacao({ hasQuotedMsg: false }), null);
  assert.equal((await obterCitacao({ hasQuotedMsg: true, getQuotedMessage: async () => { throw new Error(); } })).tipo, 'indisponivel');
});
test('impede transmitir sem referência quando WhatsApp não permite citar', async () => {
  const client = new WhatsAppClient({});
  client.pupPage = { evaluate: async (_fn, id) => { assert.equal(id, 'original'); return false; } };
  await assert.rejects(client.sendMessage('destino', 'Resposta', { quotedMessageId: 'original' }), { code: 'QUOTE_UNAVAILABLE' });
});
