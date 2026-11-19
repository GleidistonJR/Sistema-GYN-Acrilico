import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';
import { LIMITE_MIDIA, validarMidia } from '../lib/whatsapp/conteudo.mjs';
import { guardarOriginalRecente, LIMITE_ORIGINAL_RETIDO } from './whatsapp-arquivos.mjs';

const executar = promisify(execFile);

async function quadroVideo(dados, mimeType) {
  const pasta = await mkdtemp(path.join(tmpdir(), 'gyn-previa-'));
  try {
    const arquivo = path.join(pasta, 'video');
    await writeFile(arquivo, dados);
    const { stdout } = await executar(process.env.FFMPEG_PATH || ffmpeg, [
      '-nostdin', '-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file,pipe',
      '-f', mimeType === 'video/webm' ? 'matroska' : 'mov', '-i', arquivo,
      '-map', '0:v:0', '-frames:v', '1', '-vf', 'scale=480:480:force_original_aspect_ratio=decrease',
      '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1',
    ], { encoding: 'buffer', maxBuffer: 2 * 1024 * 1024, timeout: 20000, windowsHide: true });
    return stdout;
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
}

export async function gerarPrevia(dados, mimeType) {
  if (!/^(image|video)\//.test(mimeType)) return null;
  validarMidia(dados, mimeType);
  const fonte = mimeType.startsWith('video/') ? await quadroVideo(dados, mimeType) : dados;
  return sharp(fonte, { limitInputPixels: 40_000_000 })
    .rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 65 }).toBuffer();
}

export async function prepararMidiaRecente(prisma, mensagem, dados, mimeType, nome) {
  await guardarOriginalRecente(mensagem.id, dados, mensagem.enviadoEm);
  let previa = null;
  try {
    previa = await gerarPrevia(dados, mimeType);
  } catch (error) {
    console.warn('Prévia do WhatsApp indisponível:', error.code || error.name);
  }
  await prisma.midiaWhatsApp.update({
    where: { mensagemId: mensagem.id },
    data: { mimeType, nome, preparadaEm: new Date(), ...(previa ? { previa } : {}) },
  });
}

export async function obterMidiaWhatsApp(client, externaId, { somenteRecente = false, mimeType = '' } = {}) {
  const message = await client.getMessageById(externaId);
  const tamanho = Number(message?.rawData?.size);
  if (somenteRecente && (tamanho > LIMITE_MIDIA || (tamanho > LIMITE_ORIGINAL_RETIDO && !/^(image|video)\//.test(mimeType)))) return null;
  if (tamanho > LIMITE_MIDIA) throw new Error('Este arquivo ultrapassa o limite de 90 MB.');
  const media = await message?.downloadMedia();
  if (!media?.data) throw new Error('O WhatsApp não disponibiliza mais este arquivo. Peça ao cliente para reenviar.');
  if (media.data.length > Math.ceil(LIMITE_MIDIA * 4 / 3) + 4) throw new Error('Este arquivo ultrapassa o limite de 90 MB.');
  return { dados: Buffer.from(media.data, 'base64'), mimeType: media.mimetype.split(';')[0], nome: media.filename };
}
