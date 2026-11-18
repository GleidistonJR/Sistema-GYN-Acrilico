import { mkdir, readFile, writeFile, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { sessionPath } from './whatsapp-caminhos.mjs';
export const pastaArquivos = path.join(sessionPath, 'transferencias');
export function caminhoArquivo(chave) {
  if (!/^[a-f0-9-]{36}$/.test(chave)) throw new Error('Arquivo inválido.');
  return path.join(pastaArquivos, chave);
}
export async function lerArquivo(chave) { return readFile(caminhoArquivo(chave)); }
export async function salvarArquivo(chave, dados) { await mkdir(pastaArquivos, { recursive: true }); await writeFile(caminhoArquivo(chave), dados); }
export function removerAposEnvio(chave) {
  // A short preview window after sending; subsequent opens download from WhatsApp.
  // If Windows stops first, the 24-hour sweep handles the leftover file on startup.
  const timer = setTimeout(() => void unlink(caminhoArquivo(chave)).catch(() => {}), 600000);
  timer.unref();
}
export async function limparArquivos() {
  await mkdir(pastaArquivos, { recursive: true });
  for (const nome of await readdir(pastaArquivos)) {
    if (!/^[a-f0-9-]{36}(\.part)?$/.test(nome)) continue;
    const file = path.join(pastaArquivos, nome);
    const info = await stat(file).catch(() => null);
    if (info && Date.now() - info.mtimeMs > (nome.endsWith('.part') ? 3600000 : 86400000)) await unlink(file).catch(() => {});
  }
}
export async function espacoDisponivel(tamanho) {
  await limparArquivos();
  let total = tamanho;
  for (const nome of await readdir(pastaArquivos)) total += (await stat(path.join(pastaArquivos, nome))).size;
  if (total > 1024 * 1024 * 1024) throw new Error('Espaço temporário ocupado. Aguarde a limpeza dos anexos ou tente mais tarde.');
}
