'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import PainelChatInterno, { type Colega } from './PainelChatInterno';

type DadosChat = { eu: number; colegas: Colega[]; pendentes: number[] };

export default function ModalChatInterno({ colegaId, selecionar, fechar }: {
  colegaId: number | null; selecionar: (id: number | null) => void; fechar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const [dados, setDados] = useState<DadosChat | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (dialogo.current && !dialogo.current.open) dialogo.current.showModal();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function abrir() {
      try {
        const resposta = await fetch('/api/chat-interno/colegas', { cache: 'no-store', signal: controller.signal });
        if (!resposta.ok) throw new Error();
        const lista: DadosChat = await resposta.json();
        if (!controller.signal.aborted) setDados(lista);
      } catch {
        if (!controller.signal.aborted) setErro(true);
      }
    }
    void abrir();
    return () => controller.abort();
  }, [tentativa]);

  const colega = dados?.colegas.find(item => item.id === colegaId);
  return <dialog ref={dialogo} onClose={fechar} aria-labelledby={titulo}
    className="m-auto h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-4xl overflow-hidden rounded-xl border border-line bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50 sm:h-[min(78dvh,44rem)] sm:w-[calc(100%-3rem)]">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
        <h2 id={titulo} className="text-lg font-semibold">Chat interno</h2>
        <button type="button" onClick={() => dialogo.current?.close()} aria-label="Fechar chat interno"
          className="grid size-10 place-items-center rounded-md text-secondary hover:bg-surface-muted">
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      {dados ? <PainelChatInterno eu={dados.eu} colegas={dados.colegas} colega={colega}
        pendentesIniciais={dados.pendentes} onSelecionar={selecionar} /> : (
        <div className="grid flex-1 place-content-center gap-3 px-5 text-center text-sm text-muted">
          {erro ? <>
            <p role="alert">Não foi possível abrir o chat interno.</p>
            <button type="button" onClick={() => { setErro(false); setTentativa(atual => atual + 1); }}
              className="mx-auto rounded-md border border-line px-4 py-2 text-foreground hover:bg-surface-muted">Tentar novamente</button>
          </> : <p role="status">Carregando colegas…</p>}
        </div>
      )}
    </div>
  </dialog>;
}
