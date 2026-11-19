'use client';

import { useRef, useState } from 'react';

type Midia = { nome: string; mimeType: string; preparadaEm: string | null };

export default function AnexoMensagem({ id, midia }: { id: string; midia: Midia }) {
  const modal = useRef<HTMLDialogElement>(null);
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

  function abrir() {
    setErroOriginal(false);
    setAberto(true);
    if (imagem) modal.current?.showModal();
  }

  const baixar = <a href={`${base}?baixar=1`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold underline">
    {imagem ? 'Baixar imagem' : 'Baixar arquivo'}
  </a>;

  return <div className="mb-2 max-w-sm">
    {previa && !(video && aberto) ? (
      <button type="button" onClick={abrir} aria-label={`${imagem ? 'Ampliar' : 'Reproduzir'} ${midia.nome}`}
        className={`relative block max-w-full overflow-hidden rounded-lg ${imagem ? 'cursor-zoom-in' : 'cursor-pointer'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- A prévia privada já é redimensionada na ponte. */}
        <img src={previa} alt={midia.nome} loading="lazy" onError={() => setPreviaIndisponivel(versaoPrevia)}
          className="max-h-80 max-w-full object-contain" />
        {video && <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-xs text-white">Reproduzir vídeo</span>}
      </button>
    ) : <p className="break-all text-sm font-semibold">{midia.nome}</p>}

    {aberto && video && !erroOriginal && <video controls playsInline preload="metadata" src={base} poster={previa || undefined}
      onError={() => setErroOriginal(true)} className="max-h-96 max-w-full rounded" />}
    {aberto && audio && !erroOriginal && <audio controls preload="metadata" src={base}
      onError={() => setErroOriginal(true)} className="max-w-full" />}

    <div className="mt-1 flex flex-wrap gap-3">
      {((imagem && !previa) || ((audio || video) && (!aberto || erroOriginal) && (!previa || erroOriginal))) &&
        <button type="button" onClick={abrir} className="text-xs font-semibold underline">
          {erroOriginal && !imagem ? 'Tentar novamente' : imagem ? 'Abrir imagem' : 'Reproduzir'}
        </button>}
      {baixar}
    </div>
    {erroOriginal && !imagem && <p role="alert" className="mt-2 text-xs text-amber-300">
      Arquivo indisponível. Se o anexo expirou, peça para reenviá-lo.
    </p>}

    {imagem && <dialog ref={modal} aria-label={`Imagem ampliada: ${midia.nome}`} onClose={() => setAberto(false)} onClick={event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    }} className="m-auto max-h-[94dvh] max-w-[94vw] rounded-xl bg-[#202c33] p-3 text-white backdrop:bg-black/80">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-4">
        {baixar}
        <button type="button" autoFocus onClick={() => modal.current?.close()} className="rounded-md bg-white/10 px-3 py-1 text-sm font-semibold">Fechar</button>
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
        <p role="alert" className="mt-2 text-sm text-amber-300">Original indisponível. Se o anexo expirou, peça para reenviá-lo.</p>
      </>}
    </dialog>}
  </div>;
}
