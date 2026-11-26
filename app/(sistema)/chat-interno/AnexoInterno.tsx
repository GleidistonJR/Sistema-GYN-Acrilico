'use client';

import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import AnexoPdf from '../AnexoPdf';
import CartaoArquivo from '../CartaoArquivo';

export default function AnexoInterno({ url, anexo, baixar, baixando }: {
  url: string; anexo: { nome: string; mimeType: string; tamanho?: number }; baixar: () => void; baixando: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);
  if (anexo.mimeType === 'application/pdf') return <AnexoPdf key={url} url={url} nome={anexo.nome} tamanho={anexo.tamanho} sobDemanda downloadDireto />;
  if (anexo.mimeType.startsWith('audio/')) return <audio controls preload="none" src={url} aria-label="Áudio da mensagem" className="w-64 max-w-full" />;
  if (anexo.mimeType.startsWith('video/')) return <video controls playsInline preload="metadata" src={url} className="max-h-64 max-w-full rounded-lg" />;
  if (!anexo.mimeType.startsWith('image/')) return <CartaoArquivo nome={anexo.nome} tamanho={anexo.tamanho}
    formato={anexo.nome.match(/\.([a-z\d]{1,8})$/i)?.[1].toUpperCase() || 'Arquivo'}
    acao="Baixar" onClick={baixar} disabled={baixando} />;

  return <>
    <button type="button" onClick={() => { dialogo.current?.showModal(); setAberto(true); }} aria-label={`Ampliar imagem ${anexo.nome}`}
      className="block max-w-full cursor-zoom-in">
      {/* eslint-disable-next-line @next/next/no-img-element -- A imagem é servida por uma rota autenticada. */}
      <img src={url} alt={anexo.nome} loading="lazy" className="max-h-60 max-w-full rounded-lg object-contain" />
    </button>
    <dialog ref={dialogo} onClose={event => { event.stopPropagation(); setAberto(false); }} aria-label="Imagem ampliada"
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
