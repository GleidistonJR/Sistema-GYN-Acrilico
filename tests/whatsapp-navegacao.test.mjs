import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { WhatsAppClient } from '../scripts/whatsapp-client.mjs';

function fixture() {
  const client = new WhatsAppClient({});
  const page = new EventEmitter();
  page.isClosed = () => false;
  page.evaluate = async () => false;
  client.pupPage = page;
  let injections = 0;
  let logouts = 0;
  client.inject = async () => { injections++; };
  client.authStrategy = {
    logout: async () => { logouts++; }, beforeBrowserInitialized: async () => {}, afterBrowserInitialized: async () => {},
  };
  return { client, page, injections: () => injections, logouts: () => logouts };
}
const frame = url => ({ parentFrame: () => null, url: () => url });

test('frame invalidado durante navegação não encerra o processo e permite nova injeção', async () => {
  const f = fixture();
  f.page.evaluate = async () => { throw new Error("Attempted to use detached Frame 'test'."); };
  f.client._registerFramenavigatedHandler();
  f.page.emit('framenavigated', frame('https://web.whatsapp.com/'));
  await new Promise(resolve => setImmediate(resolve));
  f.page.evaluate = async () => false;
  f.page.emit('framenavigated', frame('https://web.whatsapp.com/'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.injections(), 1);
});

test('logout é processado uma vez mesmo com múltiplas navegações', async () => {
  const f = fixture();
  let disconnected = 0;
  f.client.on('disconnected', () => { disconnected++; });
  await Promise.all([f.client.handleNavigation(frame('?post_logout=1')), f.client.handleNavigation(frame('?post_logout=1'))]);
  assert.equal(disconnected, 1);
  assert.equal(f.logouts(), 1);
  f.client.emit('authenticated');
  await f.client.handleNavigation(frame('?post_logout=1'));
  assert.equal(disconnected, 2);
});

test('falhas inesperadas são encaminhadas para recuperação, sem rejeição solta', async () => {
  const f = fixture();
  let received;
  f.page.evaluate = async () => { throw new Error('falha inesperada'); };
  f.client.on('error', error => { received = error; });
  f.client._registerFramenavigatedHandler();
  f.client._registerFramenavigatedHandler();
  assert.equal(f.page.listenerCount('framenavigated'), 1);
  f.page.emit('framenavigated', frame('/'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(received?.message, 'falha inesperada');
});
