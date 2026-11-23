'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Camera, Pencil, X } from 'lucide-react';
import { urlFoto, type FotoResumo } from '@/lib/fotoItem';
import CampoFoto from './CampoFoto';
import { salvarFotoItem } from './fotoItemActions';

export default function FotoItem({ tipo, itemId, foto, nome, aoSalvar }: {
  tipo: 'material' | 'produto';
  itemId: string;
  foto?: FotoResumo | null;
  nome: string;
  aoSalvar: (foto: FotoResumo | null) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const emCurso = useRef(false);
  const titulo = useId();
  const [aberta, setAberta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState<string | null>();
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const src = foto ? urlFoto(foto) : undefined;

  useEffect(() => {
    if (aberta && !dialogo.current?.open) dialogo.current?.showModal();
  }, [aberta]);

  function abrir() {
    setValor(undefined);
    setErro('');
    setEditando(!foto);
    setAberta(true);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emCurso.current || processando || valor === undefined) return;
    emCurso.current = true;
    setSalvando(true);
    setErro('');
    try {
      const atualizada = await salvarFotoItem(tipo, itemId, valor);
      aoSalvar(atualizada);
      dialogo.current?.close();
    } catch (falha) {
      setErro(falha instanceof Error && falha.message ? falha.message : 'Não foi possível salvar a foto.');
    } finally {
      emCurso.current = false;
      setSalvando(false);
    }
  }

  return <>
    <button type="button" onClick={abrir} aria-label={src ? `Ampliar foto de ${nome}` : `Adicionar foto de ${nome}`}
      title={src ? 'Ampliar foto' : 'Adicionar foto'} className={`flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-soft text-subtle hover:border-primary-ink ${src ? 'cursor-zoom-in' : 'cursor-pointer'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Foto privada já reduzida no servidor. */}
      {src ? <img src={src} alt={nome} loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <Camera size={22} aria-hidden="true" />}
    </button>
    <dialog ref={dialogo} aria-labelledby={titulo} onClose={() => setAberta(false)}
      onCancel={event => { if (emCurso.current) event.preventDefault(); }}
      onClick={event => { if (event.target === event.currentTarget && !emCurso.current) event.currentTarget.close(); }}
      className="modal-panel m-auto w-[min(94vw,640px)] rounded-xl border border-line bg-surface text-foreground shadow-xl backdrop:bg-black/70">
      {aberta && <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titulo} className="min-w-0 break-words text-sm font-semibold">Foto de {nome}</h2>
          <button type="button" disabled={salvando} onClick={() => dialogo.current?.close()} aria-label="Fechar foto"
            className="rounded-lg p-2 text-secondary hover:bg-surface-muted"><X size={20} /></button>
        </div>
        {editando ? <form onSubmit={salvar} className="space-y-3">
          <CampoFoto fotoAtual={foto} valor={valor} onChange={setValor} onProcessando={setProcessando} desabilitado={salvando} />
          {erro && <p role="alert" className="text-sm text-danger-ink">{erro}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={salvando} onClick={() => dialogo.current?.close()}
              className="min-h-11 rounded-lg px-3 text-sm text-secondary hover:bg-surface-muted">Cancelar</button>
            <button type="submit" disabled={valor === undefined || processando || salvando}
              className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
              {salvando ? 'Salvando…' : valor === null ? 'Confirmar remoção' : 'Salvar foto'}
            </button>
          </div>
        </form> : <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Foto privada já reduzida no servidor. */}
          <img src={src} alt={nome} className="max-h-[68dvh] w-full rounded-lg object-contain" />
          <button type="button" onClick={() => setEditando(true)}
            className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-primary-ink hover:bg-surface-muted">
            <Pencil size={17} aria-hidden="true" /> Gerenciar foto
          </button>
        </>}
      </div>}
    </dialog>
  </>;
}
