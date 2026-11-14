import 'server-only';
import sharp from 'sharp';

// Lists include metadata only. Image bytes are fetched separately and cached by the browser.
export const selecaoFoto = { select: { id: true, updatedAt: true } } as const;

export async function prepararFoto(valor: unknown) {
  if (valor === undefined || valor === null) return valor;
  if (typeof valor !== 'string' || valor.length > 220_000) throw new Error('A foto é muito grande. Escolha outra imagem.');
  const resultado = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(valor);
  if (!resultado) throw new Error('Formato de foto inválido.');
  const entrada = Buffer.from(resultado[1], 'base64');
  if (entrada.length === 0 || entrada.length > 160 * 1024) throw new Error('Tamanho de foto inválido.');
  try {
    const imagem = sharp(entrada, { limitInputPixels: 16_000_000, failOn: 'error' });
    const metadata = await imagem.metadata();
    if (metadata.format !== 'jpeg') throw new Error('Formato inválido.');
    let dados = await imagem.rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true }).toBuffer();
    if (dados.length > 160 * 1024) {
      dados = await sharp(dados).resize({ width: 480, height: 480, fit: 'inside' }).jpeg({ quality: 55 }).toBuffer();
    }
    if (dados.length > 160 * 1024) throw new Error('Foto muito grande.');
    return { dados, mimeType: 'image/jpeg' };
  } catch {
    throw new Error('Não foi possível processar a foto. Escolha uma imagem JPEG, PNG ou WebP válida.');
  }
}
