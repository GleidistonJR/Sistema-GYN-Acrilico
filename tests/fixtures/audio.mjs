import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
export function audioWebm() {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'libopus', '-f', 'webm', 'pipe:1'], { windowsHide: true });
  if (result.status !== 0) throw new Error('Falha ao gerar áudio sintético.');
  return result.stdout;
}
