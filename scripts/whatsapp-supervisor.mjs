import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const worker = fileURLToPath(new URL('./whatsapp-server.mjs', import.meta.url));
let child;
let timer;
let stopping = false;
let attempts = 0;

function start() {
  const started = Date.now();
  child = spawn(process.execPath, [worker], { stdio: 'inherit', windowsHide: true, env: process.env });
  child.once('error', () => console.error('Não foi possível iniciar o processo do WhatsApp.'));
  child.once('exit', code => {
    if (stopping) return;
    if (Date.now() - started > 60000) attempts = 0;
    const delay = Math.min(30000, 2000 * 2 ** Math.min(attempts++, 4));
    console.error(`Serviço WhatsApp encerrou (código ${code}); reinício em ${delay / 1000}s.`);
    timer = setTimeout(start, delay);
  });
}

function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  if (child && child.exitCode === null) {
    child.once('exit', () => process.exit(0));
    child.kill('SIGTERM');
  } else process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
start();
