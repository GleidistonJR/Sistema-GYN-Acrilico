/** Resize on the device before sending the image over the network. */
export async function reduzirFoto(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  if (arquivo.size > 20 * 1024 * 1024) throw new Error('Escolha uma foto com até 20 MB.');
  const objectUrl = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.src = objectUrl;
    await imagem.decode();
    if (!imagem.naturalWidth || !imagem.naturalHeight) throw new Error('Imagem inválida.');
    const canvas = document.createElement('canvas');
    const fator = Math.min(1, 640 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * fator));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * fator));
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('Não foi possível preparar a foto neste navegador.');
    contexto.fillStyle = '#fff';
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    let resultado = canvas.toDataURL('image/jpeg', 0.75);
    if (resultado.length > 200_000) resultado = canvas.toDataURL('image/jpeg', 0.5);
    if (resultado.length > 200_000) throw new Error('Esta foto ficou muito grande. Escolha uma imagem mais simples.');
    return resultado;
  } catch (error) {
    if (error instanceof Error && error.message.includes('grande')) throw error;
    throw new Error('Não foi possível abrir a foto. Escolha uma imagem JPEG, PNG ou WebP.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
