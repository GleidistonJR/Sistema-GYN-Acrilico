'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MessageSquareText, Settings2 } from 'lucide-react';
import { iconeTextoRapido } from '../../../components/textosRapidos';
import { useTextosRapidos } from '../../../components/useTextosRapidos';
import GerenciarTextosRapidos from './GerenciarTextosRapidos';

export default function MenuTextosRapidos({ desabilitado, inserir }: {
  desabilitado: boolean;
  inserir: (texto: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [gerenciando, setGerenciando] = useState(false);
  const id = useId();
  const area = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const mostrar = aberto && !desabilitado;
  const { catalogo, erro, setCatalogo } = useTextosRapidos(mostrar || gerenciando);

  useEffect(() => {
    if (!mostrar) return;
    painel.current?.focus();

    function fecharAoClicarFora(event: PointerEvent) {
      if (event.target instanceof Node && !area.current?.contains(event.target)) setAberto(false);
    }

    document.addEventListener('pointerdown', fecharAoClicarFora);
    return () => document.removeEventListener('pointerdown', fecharAoClicarFora);
  }, [mostrar]);

  return <><div ref={area} className="relative shrink-0" onBlur={event => {
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
    {mostrar && <div id={id} ref={painel} tabIndex={-1} role="group" aria-label="Textos rápidos" className="absolute bottom-full -left-12 z-20 mb-2 max-h-[min(60dvh,22rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-xl sm:left-0">
      {erro && <p role="alert" className="px-3 py-2 text-sm text-danger-ink">{erro}</p>}
      {!erro && !catalogo && <p role="status" className="px-3 py-2 text-sm text-muted">Carregando textos rápidos…</p>}
      {catalogo?.textos.length === 0 && <p className="px-3 py-2 text-sm text-muted">Nenhum texto rápido cadastrado.</p>}
      {catalogo?.textos.map(({ id, label, texto }) => {
        const Icone = iconeTextoRapido(id);
        return <button key={id} type="button" onClick={() => {
          setAberto(false);
          inserir(texto);
        }}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-surface-muted focus-visible:outline-offset-[-2px]">
        <Icone size={17} className="shrink-0 text-primary-ink" aria-hidden="true" />
        <span className="break-words [overflow-wrap:anywhere]">{label}</span>
      </button>;
      })}
      {catalogo?.podeGerenciar && <div className="mt-1 border-t border-line pt-1">
        <button type="button" onClick={() => { setGerenciando(true); setAberto(false); }}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-primary-ink hover:bg-surface-muted">
          <Settings2 size={17} aria-hidden="true" /> Gerenciar textos rápidos
        </button>
      </div>}
    </div>}
  </div>
  {gerenciando && catalogo?.podeGerenciar && <GerenciarTextosRapidos textos={catalogo.textos} fechar={() => {
    setGerenciando(false);
    gatilho.current?.focus();
  }} atualizar={alteracao => setCatalogo(atual => {
    if (!atual) return atual;
    if (!('modelo' in alteracao)) return { ...atual, textos: atual.textos.filter(item => item.id !== alteracao.id) };
    const { modelo } = alteracao;
    const textos = atual.textos.some(item => item.id === modelo.id)
      ? atual.textos.map(item => item.id === modelo.id ? modelo : item)
      : [...atual.textos, modelo];
    return { ...atual, textos };
  })} />}
  </>;
}
