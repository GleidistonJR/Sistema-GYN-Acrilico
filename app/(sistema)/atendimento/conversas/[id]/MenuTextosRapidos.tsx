'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { textosRapidos } from '../../../components/textosRapidos';

export default function MenuTextosRapidos({ desabilitado, inserir }: {
  desabilitado: boolean;
  inserir: (texto: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const area = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const primeiraOpcao = useRef<HTMLButtonElement>(null);
  const mostrar = aberto && !desabilitado;

  useEffect(() => {
    if (!mostrar) return;
    primeiraOpcao.current?.focus();

    function fecharAoClicarFora(event: PointerEvent) {
      if (event.target instanceof Node && !area.current?.contains(event.target)) setAberto(false);
    }

    document.addEventListener('pointerdown', fecharAoClicarFora);
    return () => document.removeEventListener('pointerdown', fecharAoClicarFora);
  }, [mostrar]);

  return <div ref={area} className="relative shrink-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setAberto(false);
  }} onKeyDown={event => {
    if (event.key !== 'Escape' || !mostrar) return;
    event.preventDefault();
    setAberto(false);
    gatilho.current?.focus();
  }}>
    <button ref={gatilho} type="button" disabled={desabilitado} aria-label="Textos rápidos" title="Textos rápidos"
      aria-expanded={mostrar} aria-controls={mostrar ? id : undefined} onClick={() => setAberto(atual => !atual)}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-secondary hover:bg-foreground/5 aria-expanded:bg-surface-muted aria-expanded:text-primary-ink disabled:opacity-40">
      <MessageSquareText size={21} aria-hidden="true" />
    </button>
    {mostrar && <div id={id} role="group" aria-label="Textos rápidos" className="absolute bottom-full -left-12 z-20 mb-2 max-h-[min(60dvh,22rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-xl sm:left-0">
      {textosRapidos.map(({ id, label, icone: Icone, texto }, indice) => <button key={id} type="button"
        ref={indice === 0 ? primeiraOpcao : undefined} onClick={() => {
          setAberto(false);
          inserir(texto);
        }}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-surface-muted focus-visible:outline-offset-[-2px]">
        <Icone size={17} className="shrink-0 text-primary-ink" aria-hidden="true" />
        {label}
      </button>)}
    </div>}
  </div>;
}
