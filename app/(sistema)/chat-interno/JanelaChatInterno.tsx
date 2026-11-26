'use client';

import { ArrowLeft, ChevronUp, GripVertical, MessageSquare, Minus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as EventoPonteiro } from 'react';
import { createPortal } from 'react-dom';
import PainelChatInterno, { type Colega } from './PainelChatInterno';
import type { AvisoInterno } from '../components/AvisosAtendimento';

type DadosChat = { eu: string; colegas: Colega[]; pendentes: string[] };
type Posicao = { x: number; y: number };

function limitarPosicao(posicao: Posicao, painel: HTMLElement): Posicao {
  const margem = 8;
  const { width, height } = painel.getBoundingClientRect();
  return {
    x: Math.max(margem, Math.min(posicao.x, window.innerWidth - width - margem)),
    y: Math.max(margem, Math.min(posicao.y, window.innerHeight - height - margem)),
  };
}

export default function JanelaChatInterno({ usuarioId, colegaId, minimizada, aviso, selecionar, alternar, fechar }: {
  usuarioId: string;
  colegaId: string | null; minimizada: boolean; aviso: AvisoInterno | null;
  selecionar: (id: string | null) => void; alternar: () => void; fechar: () => void;
}) {
  const painel = useRef<HTMLElement>(null);
  const titulo = useId();
  const corpo = useId();
  const [dados, setDados] = useState<DadosChat | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [interagiu, setInteragiu] = useState(false);
  const chavePosicao = `gyn:posicao-chat-interno:${usuarioId}`;
  const [posicao, setPosicao] = useState<Posicao | null>(() => {
    try {
      const valor = JSON.parse(window.localStorage.getItem(chavePosicao) || 'null');
      return Number.isFinite(valor?.x) && Number.isFinite(valor?.y) ? { x: valor.x, y: valor.y } : null;
    } catch { return null; }
  });
  const arrasto = useRef<{ ponteiro: number; origem: Posicao; inicio: Posicao; ultima?: Posicao } | null>(null);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    const elemento = painel.current;
    if (!elemento) return;
    function ajustar() {
      setPosicao(atual => {
        if (!atual || !elemento) return atual;
        const limitada = limitarPosicao(atual, elemento);
        return limitada.x === atual.x && limitada.y === atual.y ? atual : limitada;
      });
    }
    const redimensionou = new ResizeObserver(ajustar);
    redimensionou.observe(elemento);
    window.addEventListener('resize', ajustar);
    return () => {
      redimensionou.disconnect();
      window.removeEventListener('resize', ajustar);
    };
  }, []);

  function guardarPosicao(nova: Posicao | null) {
    setPosicao(nova);
    try {
      if (nova) window.localStorage.setItem(chavePosicao, JSON.stringify(nova));
      else window.localStorage.removeItem(chavePosicao);
    } catch { /* A janela continua móvel se o armazenamento estiver indisponível. */ }
  }

  function iniciarArrasto(evento: EventoPonteiro<HTMLElement>) {
    if (!painel.current || arrasto.current || !evento.isPrimary || evento.button !== 0) return;
    const { left, top } = painel.current.getBoundingClientRect();
    arrasto.current = { ponteiro: evento.pointerId, origem: { x: left, y: top }, inicio: { x: evento.clientX, y: evento.clientY } };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function moverArrasto(evento: EventoPonteiro<HTMLElement>) {
    const ativo = arrasto.current;
    if (!painel.current || !ativo || ativo.ponteiro !== evento.pointerId) return;
    const dx = evento.clientX - ativo.inicio.x;
    const dy = evento.clientY - ativo.inicio.y;
    if (!ativo.ultima && Math.abs(dx) + Math.abs(dy) < 4) return;
    ativo.ultima = limitarPosicao({ x: ativo.origem.x + dx, y: ativo.origem.y + dy }, painel.current);
    setArrastando(true);
    setPosicao(ativo.ultima);
  }

  function encerrarArrasto(evento: EventoPonteiro<HTMLElement>) {
    const ativo = arrasto.current;
    if (!ativo || ativo.ponteiro !== evento.pointerId) return;
    arrasto.current = null;
    setArrastando(false);
    if (ativo.ultima) guardarPosicao(ativo.ultima);
  }

  function moverPeloTeclado(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === 'Home') {
      evento.preventDefault();
      guardarPosicao(null);
      return;
    }
    const deslocamento: Record<string, Posicao> = {
      ArrowLeft: { x: -24, y: 0 }, ArrowRight: { x: 24, y: 0 }, ArrowUp: { x: 0, y: -24 }, ArrowDown: { x: 0, y: 24 },
    };
    const passo = deslocamento[evento.key];
    if (!passo || !painel.current) return;
    evento.preventDefault();
    const { left, top } = painel.current.getBoundingClientRect();
    guardarPosicao(limitarPosicao({ x: left + passo.x, y: top + passo.y }, painel.current));
  }

  useEffect(() => {
    function cliqueFora(evento: PointerEvent) {
      if (evento.target instanceof Node && !painel.current?.contains(evento.target)) setInteragiu(false);
    }
    document.addEventListener('pointerdown', cliqueFora);
    return () => document.removeEventListener('pointerdown', cliqueFora);
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
  const nome = colega?.nome || (colegaId === aviso?.colegaId ? aviso.nome : 'Chat interno');
  const mostrarAviso = aviso && (minimizada || !interagiu || aviso.colegaId !== colegaId);
  const acao = 'grid size-8 shrink-0 place-items-center rounded-md text-secondary hover:bg-surface-muted focus-visible:outline-2';

  return createPortal(<section ref={painel} aria-labelledby={titulo} onPointerDown={() => setInteragiu(true)}
    onFocusCapture={() => setInteragiu(true)}
    onBlurCapture={evento => { if (!evento.currentTarget.contains(evento.relatedTarget)) setInteragiu(false); }}
    style={posicao ? { left: posicao.x, top: posicao.y } : undefined}
    className={`fixed z-[70] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border bg-surface text-foreground shadow-2xl print:hidden ${posicao ? '' : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 sm:bottom-4 sm:right-5'} ${mostrarAviso ? 'border-success-ink' : 'border-line'} ${minimizada ? '' : 'h-[min(29rem,calc(100dvh-5rem))]'}`}>
      <header className="flex min-h-12 shrink-0 items-center gap-1 border-b border-line bg-surface px-2">
        {colegaId && !minimizada && <button type="button" className={acao} aria-label="Mostrar colegas" title="Mostrar colegas"
          onClick={() => selecionar(null)}><ArrowLeft size={17} /></button>}
        <div onPointerDown={iniciarArrasto} onPointerMove={moverArrasto} onPointerUp={encerrarArrasto}
          onPointerCancel={encerrarArrasto} onLostPointerCapture={encerrarArrasto}
          className={`flex min-w-0 flex-1 touch-none select-none items-center gap-1.5 ${arrastando ? 'cursor-grabbing' : 'cursor-grab'}`}>
          <button type="button" className="grid h-8 w-5 shrink-0 place-items-center rounded text-muted focus-visible:outline-2"
            aria-label="Mover janela do chat" title="Arraste para mover. Use as setas ou Home para voltar ao canto." onKeyDown={moverPeloTeclado}>
            <GripVertical size={16} aria-hidden="true" />
          </button>
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-success-soft text-xs font-semibold text-success-ink" aria-hidden="true">
            {colegaId ? nome.charAt(0).toUpperCase() : <MessageSquare size={15} />}
          </span>
          <h2 id={titulo} className="min-w-0 truncate text-sm font-semibold" title={nome}>{nome}</h2>
        </div>
        <button type="button" className={acao} onClick={alternar} aria-controls={corpo} aria-expanded={!minimizada}
          aria-label={minimizada ? 'Expandir chat interno' : 'Minimizar chat interno'} title={minimizada ? 'Expandir' : 'Minimizar'}>
          {minimizada ? <ChevronUp size={17} /> : <Minus size={17} />}
        </button>
        <button type="button" onClick={fechar} aria-label="Fechar chat interno" title="Fechar" className={acao}><X size={17} /></button>
      </header>
      {mostrarAviso && <div role="status" className="shrink-0 border-b border-line bg-success-soft px-2 py-1">
        <button type="button" onClick={() => { setInteragiu(true); selecionar(aviso.colegaId); }}
          className="block w-full rounded-md px-2 py-1 text-left hover:bg-foreground/5">
          <span className="block truncate text-xs font-semibold text-success-ink">Nova mensagem de {aviso.nome}</span>
          {(minimizada || aviso.colegaId !== colegaId) && <span className="block truncate text-xs text-foreground">{aviso.previa}</span>}
        </button>
      </div>}
      <div id={corpo} className={minimizada ? 'hidden' : 'flex min-h-0 flex-1'}>
      {dados ? <PainelChatInterno eu={dados.eu} colegas={dados.colegas} colega={colega} compacto pausado={minimizada} leituraAtiva={!minimizada && interagiu}
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
  </section>, document.body);
}
