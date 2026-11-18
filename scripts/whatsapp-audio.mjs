import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

// Convert locally before sending. No audio is uploaded to a conversion service.
export function converterVoz(dados) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'pipe',
      '-i', 'pipe:0', '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '48000',
      '-c:a', 'libopus', '-b:a', '32k', '-application', 'voip', '-f', 'ogg', 'pipe:1',
    ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = []; let size = 0; let failed = false;
    const fail = () => { if (failed) return; failed = true; clearTimeout(timer); child.kill(); reject(new Error('Não foi possível preparar o áudio para o WhatsApp. Grave novamente ou envie outro arquivo.')); };
    const timer = setTimeout(fail, 30000);
    child.on('error', fail);
    child.stdin.on('error', () => {});
    child.stderr.resume();
    child.stdout.on('data', chunk => { size += chunk.length; if (size > 10 * 1024 * 1024) fail(); else chunks.push(chunk); });
    child.on('close', code => {
      clearTimeout(timer);
      if (failed) return;
      const output = Buffer.concat(chunks);
      if (code !== 0 || output.subarray(0, 4).toString() !== 'OggS' || !output.subarray(0, 100).includes(Buffer.from('OpusHead'))) { fail(); return; }
      resolve(output);
    });
    child.stdin.end(dados);
  });
}
