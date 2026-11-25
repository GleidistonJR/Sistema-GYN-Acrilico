'use client';

import { useRef, useState } from 'react';
import AnexoPdf from '../../../AnexoPdf';

type Midia = { nome: string; mimeType: string; preparadaEm: string | null };

export default function AnexoMensagem({ id, midia }: { id: string; midia: Midia }) {
  const modal = useRef<HTMLDialogElement>(null);
  const playerAudio = useRef<HTMLAudioElement>(null);
  const [aberto, setAberto] = useState(false);
  const [erroOriginal, setErroOriginal] = useState(false);
  const [previaIndisponivel, setPreviaIndisponivel] = useState<string>();
  const base = `/api/atendimento/midia/${id}`;
  const imagem = midia.mimeType.startsWith('image/');
  const video = midia.mimeType.startsWith('video/');
  const audio = midia.mimeType.startsWith('audio/');
  const versaoPrevia = midia.preparadaEm ?? '';
  const previa = (imagem || video) && versaoPrevia && previaIndisponivel !== versaoPrevia
    ? `${base}?previa=1&v=${encodeURIComponent(versaoPrevia)}`
    : '';
  const mostrarBotaoAbrir = (imagem && !previa)
    || (video && (!aberto || erroOriginal) && (!previa || erroOriginal));

  function abrir() {
    setErroOriginal(false);
    setAberto(true);
    if (imagem) modal.current?.showModal();
  }

  if (midia.mimeType.split(';')[0].toLowerCase() === 'application/pdf') return <AnexoPdf key={id} url={base} nome={midia.nome} urlVisualizacao={`${base}?visualizarPdf=1`} />;

  if (!imagem && !video && !audio) return <div className="mb-2 max-w-sm">
    <p className="break-all text-sm font-semibold">{midia.nome}</p>
    <a href={`${base}?baixar=1`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold underline">
      Baixar arquivo
    </a>
  </div>;

  return <div className="mb-2 max-w-sm">
    {previa && !(video && aberto) ? (
      <button type="button" onClick={abrir} aria-label={`${imagem ? 'Ampliar' : 'Reproduzir'} ${midia.nome}`}
        className={`relative block max-w-full overflow-hidden rounded-lg ${imagem ? 'cursor-zoom-in' : 'cursor-pointer'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- A prévia privada já é redimensionada na ponte. */}
        <img src={previa} alt={midia.nome} loading="lazy" onError={() => setPreviaIndisponivel(versaoPrevia)}
          className="max-h-80 max-w-full object-contain" />
        {video && <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-xs text-white">Reproduzir vídeo</span>}
      </button>
    ) : null}

    {aberto && video && !erroOriginal && <video controls controlsList="nodownload" playsInline preload="metadata" src={base} poster={previa || undefined}
      onError={() => setErroOriginal(true)} className="max-h-96 max-w-full rounded" />}
    {audio && <audio ref={playerAudio} aria-label="Áudio da mensagem" controls controlsList="nodownload" preload="none" src={base}
      onPlaying={() => setErroOriginal(false)} onError={() => setErroOriginal(true)} className="block w-64 max-w-full" />}

    {mostrarBotaoAbrir && <button type="button" onClick={abrir} className="mt-1 block text-xs font-semibold underline">
      {erroOriginal && video ? 'Tentar novamente' : imagem ? 'Abrir imagem' : 'Reproduzir'}
    </button>}
    {erroOriginal && !imagem && <p role="alert" className="mt-2 text-xs text-warning-ink">
      Arquivo indisponível. Se o anexo expirou, peça para reenviá-lo.
    </p>}
    {audio && erroOriginal && <button type="button" onClick={() => {
      const player = playerAudio.current;
      player?.load();
      void player?.play().catch(() => {});
    }} className="mt-1 block text-xs font-semibold underline">Tentar novamente</button>}

    {imagem && <dialog ref={modal} aria-label={`Imagem ampliada: ${midia.nome}`} onClose={() => setAberto(false)} onClick={event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    }} className="m-auto max-h-[94dvh] max-w-[94vw] rounded-xl bg-surface p-3 text-foreground backdrop:bg-black/80">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-4">
        <button type="button" autoFocus onClick={() => modal.current?.close()} className="rounded-md bg-foreground/10 px-3 py-1 text-sm font-semibold">Fechar</button>
      </div>
      {aberto && !erroOriginal && (
        // eslint-disable-next-line @next/next/no-img-element -- O original privado é buscado ao abrir o modal.
        <img src={base} alt={midia.nome} onError={() => setErroOriginal(true)} className="max-h-[78dvh] max-w-full object-contain" />
      )}
      {aberto && erroOriginal && <>
        {previa && (
          // eslint-disable-next-line @next/next/no-img-element -- A prévia continua disponível se o original expirou.
          <img src={previa} alt={midia.nome} className="max-h-[78dvh] max-w-full object-contain" />
        )}
        <p role="alert" className="mt-2 text-sm text-warning-ink">Original indisponível. Se o anexo expirou, peça para reenviá-lo.</p>
      </>}
    </dialog>}
  </div>;
}
