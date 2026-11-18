import { spawn } from 'node:child_process';
import path from 'node:path';
import { sessionPath } from './whatsapp-caminhos.mjs';

export function iniciarTunel(prisma) {
  let child, timer, heartbeat, url, stopped = false;
  const publish = () => url && prisma.$executeRaw`INSERT INTO "PonteMidiaWhatsApp" (id, url, "atualizadoEm") VALUES ('empresa', ${url}, NOW())
    ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, "atualizadoEm" = NOW()`.catch(() => console.error('Falha ao atualizar conexão de arquivos.'));
  function start() {
    if (stopped) return;
    url = null;
    child = spawn(path.join(sessionPath, 'bin', 'cloudflared.exe'), ['tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:3002', '--protocol', 'http2'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    const output = chunk => {
      text = (text + chunk.toString()).slice(-8000);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !url) { url = match[0]; void publish(); console.log('Conexão protegida de arquivos iniciada.'); }
    };
    child.stdout.on('data', output); child.stderr.on('data', output);
    child.once('error', () => console.error('Não foi possível iniciar a conexão de arquivos. Confira cloudflared.'));
    child.once('close', () => { url = null; if (!stopped) timer = setTimeout(start, 15000); });
  }
  heartbeat = setInterval(() => void publish(), 30000);
  start();
  return async () => { stopped = true; clearTimeout(timer); clearInterval(heartbeat); child?.kill();
    await prisma.$executeRaw`DELETE FROM "PonteMidiaWhatsApp" WHERE id = 'empresa'`.catch(() => {}); };
}
