'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import CartaoArquivo from './CartaoArquivo';
import BaixarAnexo from './BaixarAnexo';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

function PaginaPdf({ documento, numero, tamanho }: { documento: PDFDocumentProxy; numero: number; tamanho: number }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    let desenho: RenderTask | undefined;
    const canvas = tela.current;
    if (!canvas) return;
    void documento.getPage(numero).then(pagina => {
      if (!ativo) return;
      const base = pagina.getViewport({ scale: 1 });
      const viewport = pagina.getViewport({ scale: tamanho / Math.max(base.width, base.height) });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      desenho = pagina.render({ canvas, viewport, background: '#fff' });
      return desenho.promise;
    }).catch(() => {
      if (ativo) setFalhou(true);
    });
    return () => {
      ativo = false;
      desenho?.cancel();
    };
  }, [documento, numero, tamanho]);

  return <>
    <canvas ref={tela} role="img" aria-label={`Página ${numero} do PDF`} hidden={falhou}
      className="mx-auto h-auto max-w-full rounded bg-white" />
    {falhou && <p role="status" className="p-2 text-sm">Não foi possível exibir esta página.</p>}
  </>;
}

export default function AnexoPdf({ url, nome, urlVisualizacao = url, sobDemanda = false, tamanho, downloadDireto }: {
  url: string; nome: string; urlVisualizacao?: string; sobDemanda?: boolean; tamanho?: number | null; downloadDireto?: boolean;
}) {
  const cartao = useRef<HTMLDivElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [tentativa, setTentativa] = useState(0);
  const [documento, setDocumento] = useState<PDFDocumentProxy>();
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (sobDemanda || visivel || !cartao.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setVisivel(true);
    });
    observer.observe(cartao.current);
    return () => observer.disconnect();
  }, [sobDemanda, visivel]);

  useEffect(() => {
    if (!visivel) return;
    const controller = new AbortController();
    let tarefa: PDFDocumentLoadingTask | undefined;
    async function carregar() {
      const pdfjs = await import('pdfjs-dist');
      if (controller.signal.aborted) return;
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      tarefa = pdfjs.getDocument({ url: urlVisualizacao, isEvalSupported: false });
      const pdf = await tarefa.promise;
      if (!controller.signal.aborted) setDocumento(pdf);
    }
    void carregar().catch(() => {
      if (!controller.signal.aborted) setFalhou(true);
    });
    return () => {
      controller.abort();
      void tarefa?.destroy().catch(() => {});
    };
  }, [urlVisualizacao, tentativa, visivel]);

  function tentarNovamente() {
    setFalhou(false);
    setTentativa(valor => valor + 1);
  }

  function abrir() {
    setVisivel(true);
    setPagina(1);
    setAberto(true);
    modal.current?.showModal();
  }

  return <div ref={cartao} className="mb-2 max-w-sm">
    {sobDemanda ? <CartaoArquivo nome={nome} formato="PDF" tamanho={tamanho} acao="Abrir" onClick={abrir} />
      : <button type="button" onClick={abrir} className="block w-52 max-w-full overflow-hidden rounded-lg border border-foreground/15 bg-surface text-left">
        {documento && <PaginaPdf documento={documento} numero={1} tamanho={300} />}
        <span className="block break-words px-3 py-2 text-sm font-semibold">{nome}</span>
        <span className="block px-3 pb-2 text-xs underline">{falhou ? 'Abrir PDF · prévia indisponível' : 'Abrir PDF'}</span>
      </button>}

    <dialog ref={modal} aria-label={nome} onClose={event => {
      event.stopPropagation();
      setAberto(false);
      if (sobDemanda) {
        setVisivel(false);
        setDocumento(undefined);
        setFalhou(false);
      }
    }} onClick={event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    }} className="m-auto w-[min(94vw,56rem)] rounded-xl bg-surface text-foreground backdrop:bg-black/80">
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-foreground/15 px-4 py-3">
          <p className="min-w-0 flex-1 break-all text-sm font-semibold">{nome}</p>
          {sobDemanda ? <BaixarAnexo url={url} nome={nome} rotulo="Baixar PDF" direto={downloadDireto} /> : <a href={`${url}${url.includes('?') ? '&' : '?'}baixar=1`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm underline">
            <Download size={16} aria-hidden="true" />
            Baixar PDF
          </a>}
          <button type="button" autoFocus onClick={() => modal.current?.close()} className="rounded-md bg-foreground/10 px-3 py-1 text-sm font-semibold">Fechar</button>
        </header>
        {aberto && <div className="min-h-24 overflow-auto p-3">
          {documento && <PaginaPdf key={pagina} documento={documento} numero={pagina} tamanho={1440} />}
          {!documento && !falhou && <p role="status" className="text-sm">Carregando PDF…</p>}
          {falhou && <div role="status" className="text-sm">
            <p>Não foi possível visualizar o PDF.</p>
            <button type="button" onClick={tentarNovamente} className="mt-2 underline">Tentar novamente</button>
          </div>}
        </div>}
        {documento && documento.numPages > 1 && <footer className="flex items-center justify-center gap-4 border-t border-foreground/15 p-3 text-sm">
          <button type="button" disabled={pagina === 1} onClick={() => setPagina(valor => valor - 1)} className="underline disabled:opacity-40">Anterior</button>
          <span aria-live="polite">{pagina} de {documento.numPages}</span>
          <button type="button" disabled={pagina === documento.numPages} onClick={() => setPagina(valor => valor + 1)} className="underline disabled:opacity-40">Próxima</button>
        </footer>}
      </div>
    </dialog>
  </div>;
}
