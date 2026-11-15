'use client';

/** Render the canonical PDF, including all its pages, onto one white PNG. */
export async function orcamentoComoImagem(arquivo: Blob): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const documento = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  try {
    const primeira = await documento.getPage(1);
    const base = primeira.getViewport({ scale: 1 });
    const escala = Math.min(1.8, 14000 / (base.height * documento.numPages));
    if (escala < 1) throw new Error('Orçamento muito extenso para uma única imagem legível. Baixe o PDF.');
    const tela = document.createElement('canvas');
    tela.width = Math.ceil(base.width * escala);
    const alturaPagina = Math.ceil(base.height * escala);
    tela.height = alturaPagina * documento.numPages;
    const contexto = tela.getContext('2d');
    if (!contexto) throw new Error('Não foi possível preparar a imagem.');
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, tela.width, tela.height);
    for (let numero = 1; numero <= documento.numPages; numero++) {
      const pagina = await documento.getPage(numero);
      const folha = document.createElement('canvas');
      folha.width = tela.width;
      folha.height = alturaPagina;
      await pagina.render({ canvas: folha, viewport: pagina.getViewport({ scale: escala }), background: '#ffffff' }).promise;
      contexto.drawImage(folha, 0, (numero - 1) * alturaPagina);
      folha.width = folha.height = 0;
      pagina.cleanup();
    }
    return await new Promise<Blob>((resolve, reject) => tela.toBlob(blob => {
      tela.width = tela.height = 0;
      if (blob) resolve(blob); else reject(new Error('Não foi possível gerar a imagem.'));
    }, 'image/png'));
  } finally {
    await documento.destroy();
  }
}
