import { mkdir, readFile, writeFile, readdir, stat, unlink, rename, utimes } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { sessionPath } from './whatsapp-caminhos.mjs';
export const pastaArquivos = path.join(sessionPath, 'transferencias');
export const RETENCAO_MIDIA = 72 * 60 * 60 * 1000;
export const LIMITE_ORIGINAL_RETIDO = 2 * 1024 * 1024;
const pastaRecentes = path.join(sessionPath, 'anexos-recentes');

export function caminhoOriginalRecente(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Arquivo inválido.');
  return path.join(pastaRecentes, id);
}

export async function guardarOriginalRecente(id, dados, enviadoEm) {
  if (dados.length > LIMITE_ORIGINAL_RETIDO || Date.now() - +enviadoEm >= RETENCAO_MIDIA) return;
  const destino = caminhoOriginalRecente(id);
  const temporario = path.join(pastaRecentes, randomUUID() + '.part');
  await mkdir(pastaRecentes, { recursive: true });
  try {
    await writeFile(temporario, dados, { flag: 'wx' });
    await utimes(temporario, enviadoEm, enviadoEm);
    await rename(temporario, destino);
  } finally {
    await unlink(temporario).catch(() => {});
  }
}

export async function limparOriginaisRecentes() {
  await mkdir(pastaRecentes, { recursive: true });
  for (const nome of await readdir(pastaRecentes)) {
    if (!/^[a-f0-9-]{36}(\.part)?$/.test(nome)) continue;
    const arquivo = path.join(pastaRecentes, nome);
    const info = await stat(arquivo).catch(() => null);
    const prazo = nome.endsWith('.part') ? 3600000 : RETENCAO_MIDIA;
    if (info && Date.now() - info.mtimeMs >= prazo) await unlink(arquivo).catch(() => {});
  }
}
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
