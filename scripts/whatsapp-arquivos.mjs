import { mkdir, readFile, writeFile, readdir, stat, statfs, unlink, rename, utimes } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { sessionPath } from './whatsapp-caminhos.mjs';
export const pastaArquivos = path.join(sessionPath, 'transferencias');
export const JANELA_PREPARACAO_MIDIA = 72 * 60 * 60 * 1000;
export const RETENCAO_ORIGINAIS = 180 * 24 * 60 * 60 * 1000;
export const LIMITE_ORIGINAL_RETIDO = 10 * 1024 * 1024;
const LIMITE_ACERVO = 8 * 1024 ** 3;
const RESERVA_DISCO = 8 * 1024 ** 3;
const pastaRecentes = path.join(sessionPath, 'anexos-recentes');
let operacoesOriginais = Promise.resolve();
let bytesOriginais;

function operarOriginais(operacao) {
  const resultado = operacoesOriginais.then(operacao);
  operacoesOriginais = resultado.catch(() => {});
  return resultado;
}

export function caminhoOriginalRecente(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Arquivo inválido.');
  return path.join(pastaRecentes, id);
}

export async function guardarOriginalRecente(id, dados, enviadoEm) {
  if (!dados.length || dados.length > LIMITE_ORIGINAL_RETIDO || Date.now() - +enviadoEm >= RETENCAO_ORIGINAIS) return null;
  const destino = caminhoOriginalRecente(id);
  return operarOriginais(async () => {
    if (bytesOriginais === undefined) await medirELimparOriginais();
    if (await stat(destino).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    })) return destino;
    if (bytesOriginais + dados.length > LIMITE_ACERVO) return null;
    const disco = await statfs(pastaRecentes);
    if (disco.bavail * disco.bsize - dados.length < RESERVA_DISCO) return null;
    const temporario = path.join(pastaRecentes, randomUUID() + '.part');
    try {
      await writeFile(temporario, dados, { flag: 'wx' });
      await utimes(temporario, enviadoEm, enviadoEm);
      await rename(temporario, destino);
      bytesOriginais += dados.length;
      return destino;
    } finally {
      await unlink(temporario).catch(() => {});
    }
  }).catch(error => {
    console.warn('Falha ao guardar original do WhatsApp:', error.code || error.name);
    return null;
  });
}

async function medirELimparOriginais() {
  await mkdir(pastaRecentes, { recursive: true });
  let total = 0;
  for (const nome of await readdir(pastaRecentes)) {
    if (!/^[a-f0-9-]{36}(\.part)?$/.test(nome)) continue;
    const arquivo = path.join(pastaRecentes, nome);
    const info = await stat(arquivo).catch(() => null);
    if (!info?.isFile()) continue;
    const prazo = nome.endsWith('.part') ? 3600000 : RETENCAO_ORIGINAIS;
    if (Date.now() - info.mtimeMs >= prazo && await unlink(arquivo).then(() => true, () => false)) continue;
    total += info.size;
  }
  bytesOriginais = total;
}

export function limparOriginaisRecentes() {
  return operarOriginais(medirELimparOriginais);
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
