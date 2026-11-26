'use client';

import { useRef, useState } from 'react';
import AnexoPdf from '../../../AnexoPdf';
import CartaoArquivo from '../../../CartaoArquivo';

type Midia = { nome: string; mimeType: string; tamanho?: number | null };

export default function AnexoMensagem({ id, midia, baixar, baixando }: {
  id: string; midia: Midia; baixar: () => void; baixando: boolean;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const base = `/api/atendimento/midia/${id}`;
  const mime = midia.mimeType.split(';')[0].toLowerCase();
  const extensao = midia.nome.match(/\.([a-z\d]{1,8})$/i)?.[1].toUpperCase();
  const formato = extensao || (mime === 'application/octet-stream' ? 'Arquivo' : mime.split('/')[1]?.toUpperCase() || 'Arquivo');
  const imagem = /^image\/(jpeg|png|webp|gif)$/.test(mime);
  const video = /^video\/(mp4|webm|quicktime)$/.test(mime);
  const audio = /^audio\/(mpeg|mp4|ogg|wav|webm)$/.test(mime);
  const visualizavel = extensao !== 'CDR' && (imagem || video || audio);

  if (mime === 'application/pdf' && extensao !== 'CDR') return <AnexoPdf key={id} url={base} nome={midia.nome} tamanho={midia.tamanho} urlVisualizacao={`${base}?visualizarPdf=1`} sobDemanda />;

  function abrir() {
    setFalhou(false);
    setAberto(true);
    modal.current?.showModal();
  }

  return <div className="mb-2 max-w-sm">
    <CartaoArquivo nome={midia.nome} formato={formato} tamanho={midia.tamanho}
      acao={visualizavel ? 'Abrir' : 'Baixar'} onClick={visualizavel ? abrir : baixar} disabled={!visualizavel && baixando} />
    {visualizavel && <dialog ref={modal} aria-label={midia.nome} onClose={() => setAberto(false)}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
      className="m-auto w-[min(94vw,40rem)] max-h-[94dvh] rounded-xl bg-surface p-3 text-foreground backdrop-blur-sm backdrop:bg-black/75">
      <div className="mb-3 flex items-center justify-between gap-4 break-all">
        <p className="font-semibold">{midia.nome}</p>
        <button type="button" autoFocus onClick={() => modal.current?.close()} className="rounded-md bg-foreground/10 px-3 py-1 text-sm font-semibold">Fechar</button>
      </div>
      {aberto && !falhou && imagem && (
        // eslint-disable-next-line @next/next/no-img-element -- Original autenticado carregado após abrir.
        <img src={base} alt={midia.nome} onError={() => setFalhou(true)} className="mx-auto max-h-[78dvh] max-w-full object-contain" />
      )}
      {aberto && !falhou && video && <video controls playsInline src={base} onError={() => setFalhou(true)} className="mx-auto max-h-[78dvh] max-w-full" />}
      {aberto && !falhou && audio && <audio controls src={base} onError={() => setFalhou(true)} className="w-full" />}
      {falhou && <p role="alert" className="text-sm text-warning-ink">
        Não foi possível abrir o arquivo no navegador.{' '}
        <button type="button" className="underline" onClick={() => { modal.current?.close(); baixar(); }}>Baixar arquivo</button>
      </p>}
    </dialog>}
  </div>;
}
