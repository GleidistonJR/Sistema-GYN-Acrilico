import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import whatsapp from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { WhatsAppClient } from './whatsapp-client.mjs';
import { PrismaClient } from '@prisma/client';
import { criarServicoMensagens } from './whatsapp-mensagens.mjs';
import { criarEventosAtendimento } from './whatsapp-eventos.mjs';
import { criarFotosContatos } from './whatsapp-fotos.mjs';
import { publicarEstadoServico } from '../lib/whatsapp/estado-servico.mjs';

const prisma = new PrismaClient();
let mensagens = null;
let fotos = null;
const eventos = criarEventosAtendimento({ onEnvio: conta => mensagens?.acordarEnvios(conta), onFotos: () => void fotos?.acordar() });

const { LocalAuth } = whatsapp;
const token = process.env.WHATSAPP_BRIDGE_TOKEN;
if (!token || token.length < 32) throw new Error('Configure WHATSAPP_BRIDGE_TOKEN com pelo menos 32 caracteres.');
const port = Number(process.env.WHATSAPP_BRIDGE_PORT || 3001);
const dataPath = path.resolve('.whatsapp-session');
const executablePath = [
  process.env.WHATSAPP_BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(candidate => candidate && existsSync(candidate));

let client = null;
let generation = 0;
let busy = false;
let watchdog;
let state = { status: 'desconectado', qr: null, numero: null, mensagem: null, atualizadoEm: new Date().toISOString() };
let heartbeatChain = Promise.resolve();
function heartbeat() {
  void fotos?.acordar();
  if (state.status === 'conectado') void client?.assegurarEventosMensagens().catch(() => console.error('Não foi possível conferir eventos de recebimento.'));
  heartbeatChain = heartbeatChain.catch(() => {}).then(() => publicarEstadoServico(prisma, state));
  void heartbeatChain.catch(() => console.error('Falha ao atualizar disponibilidade WhatsApp.'));
  return heartbeatChain;
}
const heartbeatTimer = setInterval(() => void heartbeat(), 30000);
function update(values) { state = { ...state, ...values, atualizadoEm: new Date().toISOString() }; void heartbeat(); }
function snapshot() {
  if (state.status === 'qr' && Date.now() - Date.parse(state.atualizadoEm) > 65000) {
    return { ...state, qr: null, mensagem: 'Aguardando renovação do QR Code…' };
  }
  return state;
}
function authorized(header) {
  const actual = Buffer.from(header || '');
  const expected = Buffer.from('Bearer ' + token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function destroyCurrent() {
  fotos?.stop(); fotos = null;
  await mensagens?.stop();
  mensagens = null;
  const previous = client;
  client = null;
  if (previous) await previous.destroy().catch(() => {});
}

async function connect() {
  if (busy || ['iniciando', 'qr', 'autenticando', 'conectado'].includes(state.status)) return;
  busy = true;
  const current = ++generation;
  clearTimeout(watchdog);
  update({ status: 'iniciando', qr: null, numero: null, mensagem: null });
  try {
    await destroyCurrent();
    const instance = new WhatsAppClient({
      authStrategy: new LocalAuth({ clientId: 'empresa', dataPath }),
      puppeteer: { headless: true, ...(executablePath ? { executablePath } : {}) },
      webVersionCache: { type: 'local', path: path.join(dataPath, 'cache') },
      authTimeoutMs: 60000,
      qrMaxRetries: 0,
      takeoverOnConflict: false,
      deviceName: 'GYN Acrílico — Atendimento',
    });
    client = instance;
    let qrSequence = 0;
    let readyProbe;
    const active = () => current === generation && instance === client;
    const fail = async (message) => {
      if (!active()) return;
      ++generation;
      clearTimeout(watchdog);
      clearTimeout(readyProbe);
      update({ status: 'erro', qr: null, numero: null, mensagem: message });
      await destroyCurrent();
    };
    instance.on('qr', async value => {
      if (!active()) return;
      const sequence = ++qrSequence;
      clearTimeout(watchdog);
      try {
        const qr = await QRCode.toDataURL(value, { width: 320, margin: 4, errorCorrectionLevel: 'M' });
        if (active() && sequence === qrSequence && ['iniciando', 'qr'].includes(state.status)) {
          update({ status: 'qr', qr, numero: null, mensagem: null });
        }
      } catch { await fail('Não foi possível gerar o QR Code. Tente novamente.'); }
    });
    instance.on('authenticated', () => {
      if (!active()) return;
      if (state.status === 'conectado' || state.status === 'autenticando') return;
      update({ status: 'autenticando', qr: null, mensagem: null });
      clearTimeout(watchdog);
      watchdog = setTimeout(() => void fail('A sincronização demorou demais. Tente reconectar.'), 180000);
      // A restored profile can finish injecting before the library reports ready.
      // Retry its own completion callback only after the store and message binding exist.
      readyProbe = setTimeout(() => {
        if (!active() || state.status !== 'autenticando' || !instance.info) return;
        void instance.pupPage.evaluate(async () => {
          if (window.WWebJS && typeof window.onAddMessageEvent === 'function'
            && window.require('WAWebSocketModel').Socket.hasSynced
            && typeof window.onAppStateHasSyncedEvent === 'function') {
            await window.onAppStateHasSyncedEvent();
          }
        }).catch(() => {});
      }, 15000);
    });
    instance.on('ready', () => {
      if (!active()) return;
      clearTimeout(watchdog);
      clearTimeout(readyProbe);
      update({ status: 'conectado', qr: null, numero: instance.info?.wid?.user ?? null, mensagem: null });
      if (!mensagens && state.numero) {
        fotos = criarFotosContatos({ prisma, client: instance, ativo: () => active() && state.status === 'conectado' });
        void fotos.acordar();
        mensagens = criarServicoMensagens({ prisma, client: instance, conta: state.numero, ativo: () => active() && state.status === 'conectado' });
        const service = mensagens;
        void instance.assegurarEventosMensagens().then(() => service.start()).catch(error => {
          console.error('Falha ao iniciar recebimento WhatsApp:', error?.code || error?.name);
          void fail('Não foi possível ativar o recebimento. Reconecte o serviço.');
        });
      }
    });
    instance.on('auth_failure', () => void fail('O WhatsApp recusou a autenticação. Tente conectar novamente.'));
    instance.on('error', () => void fail('O navegador do WhatsApp encontrou uma falha. Tente conectar novamente.'));
    instance.on('disconnected', () => {
      if (!active()) return;
      ++generation;
      clearTimeout(watchdog);
      update({ status: 'desconectado', qr: null, numero: null, mensagem: 'Conexão encerrada. Você pode conectar novamente.' });
      // Do not destroy the page inside the library's logout/navigation callback.
      // Keep it for destroyCurrent() to close before the next explicit connection.
    });
    watchdog = setTimeout(() => void fail('Não foi possível abrir o WhatsApp Web. Verifique a internet e tente novamente.'), 90000);
    void instance.initialize().catch(() => fail('Falha ao iniciar o WhatsApp Web. Verifique o navegador e tente novamente.'));
  } catch {
    update({ status: 'erro', qr: null, numero: null, mensagem: 'Não foi possível iniciar a conexão.' });
  } finally { busy = false; }
}

async function disconnect() {
  fotos?.stop(); fotos = null;
  if (busy) return;
  busy = true;
  ++generation;
  clearTimeout(watchdog);
  await mensagens?.stop();
  mensagens = null;
  const previous = client;
  client = null;
  update({ status: 'encerrando', qr: null, numero: null, mensagem: null });
  try {
    if (previous) {
      // logout revokes this linked device and removes its saved authentication.
      await previous.logout();
      await previous.destroy().catch(() => {});
    }
    update({ status: 'desconectado', mensagem: null });
  } catch {
    await previous?.destroy().catch(() => {});
    update({ status: 'erro', mensagem: 'Não foi possível confirmar a desconexão. Remova este aparelho pelo WhatsApp no celular.' });
  } finally { busy = false; }
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!authorized(req.headers.authorization)) { res.writeHead(401); res.end('{"erro":"Não autorizado"}'); return; }
  if (req.method === 'GET' && req.url === '/events') { eventos.subscribe(res); return; }
  if (req.method === 'GET' && req.url === '/status') { res.end(JSON.stringify(snapshot())); return; }
  if (req.method === 'POST' && req.url === '/connect') {
    void connect(); res.writeHead(202); res.end(JSON.stringify(snapshot())); return;
  }
  if (req.method === 'POST' && req.url === '/disconnect') {
    void disconnect(); res.writeHead(202); res.end(JSON.stringify(snapshot())); return;
  }
  if (req.method === 'POST' && req.url === '/sync') {
    if (!mensagens || state.status !== 'conectado') { res.writeHead(409); res.end('{"erro":"WhatsApp desconectado"}'); return; }
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      try {
        const { clienteId } = JSON.parse(body);
        if (typeof clienteId !== 'string' || clienteId.length > 100) throw new Error();
        void mensagens.sincronizar(clienteId).catch(error => console.error('Falha na sincronização:', error?.code || error?.name));
        res.writeHead(202); res.end('{"ok":true}');
      } catch { res.writeHead(400); res.end('{"erro":"Solicitação inválida"}'); }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/shutdown') {
    res.end('{"ok":true}'); setTimeout(() => void stop(), 100); return;
  }
  res.writeHead(404); res.end('{"erro":"Não encontrado"}');
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(port, '127.0.0.1', () => {
  console.log(`Serviço WhatsApp disponível em 127.0.0.1:${port}`);
  // Restore only an existing profile. A first-time QR is requested from the admin screen.
  if (existsSync(path.join(dataPath, 'session-empresa'))) void connect();
});
server.on('error', () => { console.error('Não foi possível abrir a porta do serviço WhatsApp.'); process.exit(1); });
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeatTimer);
  update({ status: 'desconectado', numero: null, qr: null });
  await heartbeatChain.catch(() => {});
  ++generation;
  clearTimeout(watchdog);
  server.close();
  await eventos.stop();
  await destroyCurrent(); // Preserve LocalAuth when stopping the process.
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
