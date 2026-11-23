'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { reduzirFoto } from '@/lib/reduzirFoto';
import { urlFoto, type FotoResumo } from '@/lib/fotoItem';

interface Props {
  fotoAtual?: FotoResumo | null;
  valor: string | null | undefined;
  onChange: (foto: string | null) => void;
  onProcessando: (processando: boolean) => void;
  desabilitado?: boolean;
}

export default function CampoFoto({ fotoAtual, valor, onChange, onProcessando, desabilitado = false }: Props) {
  const arquivoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const versao = useRef(0);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  const preview = valor === undefined ? fotoAtual ? urlFoto(fotoAtual) : null : valor;

  useEffect(() => () => { versao.current++; onProcessando(false); }, [onProcessando]);

  async function selecionar(arquivo?: File) {
    if (!arquivo) return;
    const atual = ++versao.current;
    setErro('');
    setProcessando(true);
    onProcessando(true);
    try {
      const foto = await reduzirFoto(arquivo);
      if (versao.current === atual) onChange(foto);
    } catch (error) {
      if (versao.current === atual) setErro(error instanceof Error ? error.message : 'Não foi possível abrir a foto.');
    } finally {
      if (versao.current === atual) {
        setProcessando(false);
        onProcessando(false);
      }
      if (arquivoInput.current) arquivoInput.current.value = '';
      if (cameraInput.current) cameraInput.current.value = '';
    }
  }

  return (
    <fieldset className="rounded-xl border border-line p-3 space-y-3" disabled={desabilitado || processando}>
      <legend className="px-1 text-sm font-semibold text-secondary">Foto do item (opcional)</legend>
      <div className="flex flex-col min-[400px]:flex-row gap-3">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-surface-soft">
          {/* Uploaded photos are already small and served through an authenticated endpoint. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="Prévia da foto do item" className="h-full w-full object-contain" /> : <Camera size={30} className="text-subtle" />}
        </div>
        <div className="min-w-0 flex flex-1 flex-col gap-2">
          <input ref={arquivoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Selecionar foto do item" className="sr-only" onChange={event => { void selecionar(event.target.files?.[0]); }} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" aria-label="Capturar foto do item" className="sr-only" onChange={event => { void selecionar(event.target.files?.[0]); }} />
          <button type="button" onClick={() => arquivoInput.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-secondary hover:bg-surface-soft disabled:opacity-50"><ImagePlus size={17} />Escolher foto</button>
          <button type="button" onClick={() => cameraInput.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-secondary hover:bg-surface-soft disabled:opacity-50"><Camera size={17} />Tirar foto</button>
          {preview && <button type="button" onClick={() => onChange(null)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-danger-ink hover:bg-danger-soft"><Trash2 size={16} />Remover foto</button>}
        </div>
      </div>
      <p className="text-xs text-muted">A imagem é reduzida automaticamente. No celular, “Tirar foto” usa a câmera quando disponível.</p>
      {processando && <p role="status" className="text-sm text-secondary">Preparando foto...</p>}
      {erro && <p role="alert" className="text-sm text-danger-ink">{erro}</p>}
    </fieldset>
  );
}
