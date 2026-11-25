'use client';

import { FileText, X } from 'lucide-react';
import { useRef, useState } from 'react';

export default function AnexoInterno({ url, anexo }: { url: string; anexo: { nome: string; mimeType: string } }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);
  if (anexo.mimeType.startsWith('audio/')) return <audio controls preload="none" src={url} aria-label="Áudio da mensagem" className="w-64 max-w-full" />;
  if (anexo.mimeType.startsWith('video/')) return <video controls playsInline preload="metadata" src={url} className="max-h-64 max-w-full rounded-lg" />;
  if (!anexo.mimeType.startsWith('image/')) return <a href={url + '&baixar=1'} className="flex items-center gap-2 text-sm underline">
    <FileText size={19} className="shrink-0" aria-hidden="true" /><span className="break-all">{anexo.nome}</span>
  </a>;

  return <>
    <button type="button" onClick={() => { dialogo.current?.showModal(); setAberto(true); }} aria-label={`Ampliar imagem ${anexo.nome}`}
      className="block max-w-full cursor-zoom-in">
      {/* eslint-disable-next-line @next/next/no-img-element -- A imagem é servida por uma rota autenticada. */}
      <img src={url} alt={anexo.nome} loading="lazy" className="max-h-60 max-w-full rounded-lg object-contain" />
    </button>
    <dialog ref={dialogo} onClose={() => setAberto(false)} aria-label="Imagem ampliada"
      className="m-auto max-h-[92dvh] max-w-[92vw] rounded-xl bg-surface p-3 text-foreground backdrop:bg-black/80">
      <button type="button" autoFocus onClick={() => dialogo.current?.close()} aria-label="Fechar imagem"
        className="mb-2 ml-auto block rounded p-2 hover:bg-surface-muted"><X size={20} /></button>
      {aberto && (
        // eslint-disable-next-line @next/next/no-img-element -- A imagem é servida por uma rota autenticada.
        <img src={url} alt={anexo.nome} className="max-h-[78dvh] max-w-full object-contain" />
      )}
    </dialog>
  </>;
}
