import { LIMITE_MIDIA } from '../lib/whatsapp/conteudo.mjs';
import { guardarOriginalRecente, LIMITE_ORIGINAL_RETIDO } from './whatsapp-arquivos.mjs';

export async function prepararMidiaRecente(prisma, mensagem, dados, mimeType, nome) {
  await guardarOriginalRecente(mensagem.id, dados, mensagem.enviadoEm);
  await prisma.midiaWhatsApp.update({
    where: { mensagemId: mensagem.id },
    data: { mimeType, nome, preparadaEm: new Date() },
  });
}

export async function obterMidiaWhatsApp(client, externaId, { somenteRecente = false } = {}) {
  const message = await client.getMessageById(externaId);
  const tamanho = Number(message?.rawData?.size);
  if (somenteRecente && (!(tamanho > 0) || tamanho > LIMITE_ORIGINAL_RETIDO)) return null;
  if (tamanho > LIMITE_MIDIA) throw new Error('Este arquivo ultrapassa o limite de 90 MB.');
  const media = await message?.downloadMedia();
  if (!media?.data) throw new Error('O WhatsApp não disponibiliza mais este arquivo. Peça ao cliente para reenviar.');
  if (somenteRecente && media.data.length > Math.ceil(LIMITE_ORIGINAL_RETIDO * 4 / 3) + 4) return null;
  if (media.data.length > Math.ceil(LIMITE_MIDIA * 4 / 3) + 4) throw new Error('Este arquivo ultrapassa o limite de 90 MB.');
  const mimeType = String(media.mimetype || message.rawData?.mimetype || 'application/octet-stream').split(';')[0];
  return { dados: Buffer.from(media.data, 'base64'), mimeType, nome: media.filename || message.rawData?.filename };
}
