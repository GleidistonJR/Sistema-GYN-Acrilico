'use client';

import Link from 'next/link';
import { ArrowLeft, MessageSquare, Paperclip, Reply, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { FORMATOS_ANEXO_INTERNO, LIMITE_ANEXO_INTERNO } from '@/lib/chat-interno-midia';
import GravarAudio from '../atendimento/conversas/[id]/GravarAudio';
import AnexoInterno from './AnexoInterno';

export type Colega = { id: string; nome: string; disponivel: boolean; perfil: string | null };
type Mensagem = {
  id: number; remetenteId: string; texto: string; criadaEm: string;
  anexo?: { nome: string; mimeType: string } | null;
  citacao?: { id: number; remetenteId: string; texto: string } | null;
};
type Historico = { mensagens: Mensagem[]; anteriores: boolean };
const hora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const limite = 4000;
const perfisAvulsos = new Map([['RECEPCAO', 'Recepção'], ['COMERCIAL', 'Comercial'], ['PONTO', 'Ponto e relatórios']]);

function mesclar(atuais: Mensagem[], novas: Mensagem[]) {
  const ids = new Set(atuais.map(item => item.id));
  const faltantes = novas.filter(item => !ids.has(item.id));
  return faltantes.length ? [...atuais, ...faltantes].sort((a, b) => a.id - b.id) : atuais;
}

export default function PainelChatInterno({ eu, colegas, colega, pendentesIniciais, onSelecionar }: {
  eu: string; colegas: Colega[]; colega?: Colega; pendentesIniciais: string[];
  onSelecionar?: (id: string | null) => void;
}) {
  const [pendentes, setPendentes] = useState(pendentesIniciais);

  useEffect(() => {
    const atualizar = (evento: Event) => setPendentes((evento as CustomEvent<string[]>).detail);
    window.addEventListener('chat-interno:pendentes', atualizar);
    return () => window.removeEventListener('chat-interno:pendentes', atualizar);
  }, []);

  const removerPendente = useCallback((id: string) => {
    setPendentes(atuais => atuais.filter(colegaId => colegaId !== id));
    window.dispatchEvent(new Event('chat-interno:atualizar-avisos'));
  }, []);

  return <div className={`flex min-h-0 bg-chat-canvas text-foreground ${onSelecionar ? 'flex-1' : 'h-[calc(100dvh-4rem)]'}`}>
    <aside className={`${colega ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-line bg-surface md:w-64 lg:w-72`} aria-label="Colegas">
      {!onSelecionar && <h1 className="border-b border-line px-5 py-5 text-xl font-semibold">Chat interno</h1>}
      <div className="min-h-0 overflow-y-auto p-2">
        {!colegas.length && <p className="px-3 py-4 text-sm text-muted">Nenhum colega disponível.</p>}
        {colegas.map(item => {
          const naoLida = pendentes.includes(item.id);
          const selecionado = item.id === colega?.id;
          const classe = `flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${selecionado ? 'bg-success-soft' : 'hover:bg-surface-muted'}`;
          const conteudo = <>
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-chat-avatar text-sm font-semibold text-success-ink">
              {item.nome.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm ${naoLida ? 'font-bold' : 'font-medium'}`}>{item.nome}</span>
              {!item.disponivel && <span className="text-xs text-muted">Indisponível</span>}
              {item.perfil && <span className="block text-xs text-muted">Acesso avulso · {perfisAvulsos.get(item.perfil)}</span>}
            </span>
            {naoLida && <span className="size-2.5 shrink-0 rounded-full bg-success-ink" role="img" aria-label="Mensagens não lidas" />}
          </>;
          return onSelecionar
            ? <button key={item.id} type="button" aria-current={selecionado || undefined} className={classe} onClick={() => onSelecionar(item.id)}>{conteudo}</button>
            : <Link key={item.id} href={`/chat-interno?colega=${item.id}`} aria-current={selecionado ? 'page' : undefined} className={classe}>{conteudo}</Link>;
        })}
      </div>
    </aside>
    {colega ? <ConversaInterna key={colega.id} eu={eu} colega={colega} onLida={removerPendente}
      onVoltar={onSelecionar ? () => onSelecionar(null) : undefined} /> : (
      <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-muted md:flex">
        <MessageSquare size={32} aria-hidden="true" />
        <p className="text-sm">Selecione um colega para conversar.</p>
      </div>
    )}
  </div>;
}

function ConversaInterna({ eu, colega, onLida, onVoltar }: {
  eu: string; colega: Colega; onLida: (id: string) => void; onVoltar?: () => void;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [anteriores, setAnteriores] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [gravando, setGravando] = useState(false);
  const [responder, setResponder] = useState<Mensagem | null>(null);
  const [contexto, setContexto] = useState<Mensagem[] | null>(null);
  const [salto, setSalto] = useState<{ id: number } | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [previewAudio, setPreviewAudio] = useState('');
  const lista = useRef<HTMLDivElement>(null);
  const campoArquivo = useRef<HTMLInputElement>(null);
  const campoTexto = useRef<HTMLTextAreaElement>(null);
  const seguirFim = useRef(true);
  const leuAte = useRef(0);
  const marcando = useRef(false);
  const carregou = useRef(false);
  const enviandoRef = useRef(false);
  const pedidoRef = useRef<string | null>(null);
  const base = `/api/chat-interno/${colega.id}`;
  const ultimaRecebida = mensagens.findLast(mensagem => mensagem.remetenteId !== eu)?.id ?? 0;

  const marcarLida = useCallback(async () => {
    if (contexto || !seguirFim.current || !document.hasFocus() || document.hidden || marcando.current || ultimaRecebida <= leuAte.current) return;
    marcando.current = true;
    try {
      const resposta = await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ate: ultimaRecebida }) });
      if (resposta.ok) {
        leuAte.current = ultimaRecebida;
        onLida(colega.id);
      }
    } catch { /* Tenta novamente na próxima atualização. */ }
    finally { marcando.current = false; }
  }, [base, colega.id, contexto, onLida, ultimaRecebida]);

  useEffect(() => {
    const controller = new AbortController();
    let ocupado = false;
    async function atualizar() {
      if (ocupado || document.hidden) return;
      ocupado = true;
      try {
        const resposta = await fetch(base, { cache: 'no-store', signal: controller.signal });
        if (!resposta.ok) throw new Error('Não foi possível atualizar a conversa.');
        const dados: Historico = await resposta.json();
        if (controller.signal.aborted) return;
        setMensagens(atuais => mesclar(atuais, dados.mensagens));
        if (!carregou.current) { setAnteriores(dados.anteriores); setErro(''); }
        carregou.current = true;
        setCarregando(false);
      } catch {
        if (!controller.signal.aborted && !carregou.current) {
          setErro('Não foi possível carregar a conversa.');
          setCarregando(false);
        }
      } finally { ocupado = false; }
    }
    void atualizar();
    const intervalo = setInterval(atualizar, 5000);
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => {
      controller.abort();
      clearInterval(intervalo);
      window.removeEventListener('focus', atualizar);
      document.removeEventListener('visibilitychange', atualizar);
    };
  }, [base]);

  useEffect(() => {
    const el = lista.current;
    if (el && !contexto && seguirFim.current) el.scrollTop = el.scrollHeight;
    void marcarLida();
  }, [mensagens, contexto, marcarLida]);

  useEffect(() => {
    if (!salto) return;
    const alvo = lista.current?.querySelector<HTMLElement>(`[data-mensagem-id="${salto.id}"]`);
    alvo?.scrollIntoView({ block: 'center' });
    alvo?.focus({ preventScroll: true });
  }, [salto]);

  useEffect(() => {
    if (!arquivo?.type.startsWith('audio/')) return;
    const url = URL.createObjectURL(arquivo);
    setPreviewAudio(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  useEffect(() => {
    const intervalo = setInterval(() => void marcarLida(), 5000);
    window.addEventListener('focus', marcarLida);
    return () => { clearInterval(intervalo); window.removeEventListener('focus', marcarLida); };
  }, [marcarLida]);

  async function carregarAnteriores() {
    if (!mensagens[0] || carregandoAnteriores) return;
    setCarregandoAnteriores(true);
    seguirFim.current = false;
    try {
      const resposta = await fetch(`${base}?antes=${mensagens[0].id}`, { cache: 'no-store' });
      if (!resposta.ok) throw new Error();
      const dados: Historico = await resposta.json();
      setMensagens(atuais => mesclar(atuais, dados.mensagens));
      setAnteriores(dados.anteriores);
    } catch { setErro('Não foi possível carregar as mensagens anteriores.'); }
    finally { setCarregandoAnteriores(false); }
  }

  async function irParaCitacao(id: number) {
    if (localizando) return;
    seguirFim.current = false;
    setErro('');
    if ((contexto ?? mensagens).some(item => item.id === id)) {
      setSalto({ id });
      return;
    }
    setLocalizando(true);
    try {
      const resposta = await fetch(`${base}?alvo=${id}`, { cache: 'no-store' });
      if (!resposta.ok) throw new Error();
      const dados: { mensagens: Mensagem[] } = await resposta.json();
      setContexto(dados.mensagens);
      setSalto({ id });
    } catch { setErro('Não foi possível localizar a mensagem citada.'); }
    finally { setLocalizando(false); }
  }

  function voltarAoFim() {
    seguirFim.current = true;
    setContexto(null);
    setSalto(null);
  }

  function escolherArquivo(novo: File | null) {
    setPreviewAudio('');
    if (campoArquivo.current) campoArquivo.current.value = '';
    if (novo && (!novo.size || novo.size > LIMITE_ANEXO_INTERNO)) {
      setErro('Escolha um arquivo de até 4 MB.');
      return;
    }
    pedidoRef.current = null;
    setErro('');
    setArquivo(novo);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoRef.current || gravando || (!texto.trim() && !arquivo) || !colega.disponivel) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErro('');
    try {
      const pedidoId = pedidoRef.current ??= crypto.randomUUID();
      const formulario = new FormData();
      formulario.set('texto', texto);
      formulario.set('pedidoId', pedidoId);
      if (arquivo) formulario.set('arquivo', arquivo);
      if (responder) formulario.set('citacaoId', String(responder.id));
      const resposta = await fetch(base, { method: 'POST', body: formulario });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível enviar a mensagem.');
      voltarAoFim();
      setMensagens(atuais => mesclar(atuais, [dados]));
      setTexto('');
      escolherArquivo(null);
      setResponder(null);
      pedidoRef.current = null;
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar a mensagem.'); }
    finally { enviandoRef.current = false; setEnviando(false); }
  }

  return <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={`Conversa com ${colega.nome}`}>
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      {onVoltar ? <button type="button" onClick={onVoltar} aria-label="Voltar aos colegas" className="rounded-md p-2 text-secondary hover:bg-surface-muted md:hidden"><ArrowLeft size={20} /></button>
        : <Link href="/chat-interno" aria-label="Voltar aos colegas" className="rounded-md p-2 text-secondary hover:bg-surface-muted md:hidden"><ArrowLeft size={20} /></Link>}
      <h2 className="truncate text-lg font-semibold">{colega.nome}</h2>
    </header>
    <div ref={lista} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-8"
      onScroll={event => {
        const el = event.currentTarget;
        seguirFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (seguirFim.current) void marcarLida();
      }}>
      {carregando && <p role="status" className="text-center text-sm text-muted">Carregando conversa…</p>}
      {!carregando && !erro && !mensagens.length && <p className="text-center text-sm text-muted">Nenhuma mensagem nesta conversa.</p>}
      {!contexto && anteriores && <button type="button" disabled={carregandoAnteriores} onClick={() => void carregarAnteriores()}
        className="mx-auto block rounded-full bg-surface px-4 py-2 text-xs text-secondary shadow-sm">
        {carregandoAnteriores ? 'Carregando…' : 'Carregar anteriores'}
      </button>}
      {(contexto ?? mensagens).map(mensagem => (
        <article key={mensagem.id} data-mensagem-id={mensagem.id} tabIndex={-1}
          className={`flex items-start gap-1 rounded-lg outline-none ${salto?.id === mensagem.id ? 'ring-2 ring-success-ink' : ''} ${mensagem.remetenteId === eu ? 'justify-end' : ''}`}>
          <div className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[75%] ${mensagem.remetenteId === eu ? 'rounded-tr-sm bg-chat-outgoing' : 'rounded-tl-sm bg-surface'}`}>
            {mensagem.citacao && <button type="button" disabled={localizando} onClick={() => void irParaCitacao(mensagem.citacao!.id)}
              title="Ir para a mensagem original" aria-label="Ir para a mensagem citada"
              className="mb-2 block w-full rounded border-l-4 border-success-ink bg-foreground/5 px-2 py-1 text-left text-xs hover:bg-foreground/10">
              <span className="font-semibold text-success-ink">{mensagem.citacao.remetenteId === eu ? 'Você' : colega.nome}</span>
              <span className="line-clamp-2 break-words">{mensagem.citacao.texto}</span>
            </button>}
            {mensagem.anexo && <AnexoInterno url={`${base}?arquivo=${mensagem.id}`} anexo={mensagem.anexo} />}
            {mensagem.texto && <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{mensagem.texto}</p>}
            <time dateTime={mensagem.criadaEm} className="mt-1 block text-right text-[11px] text-muted">{hora.format(new Date(mensagem.criadaEm))}</time>
          </div>
          {colega.disponivel && <button type="button" disabled={enviando} onClick={() => {
            setResponder(mensagem); pedidoRef.current = null; campoTexto.current?.focus();
          }} aria-label="Responder esta mensagem" title="Responder" className="shrink-0 rounded-full p-2 text-secondary hover:bg-foreground/10">
            <Reply size={17} aria-hidden="true" />
          </button>}
        </article>
      ))}
    </div>
    <footer className="shrink-0 border-t border-line bg-surface p-3 sm:px-5">
      {contexto && <div className="mb-2 flex items-center justify-between gap-2 rounded bg-surface-muted px-2 py-1 text-xs text-muted">
        <span>Trecho da mensagem citada</span>
        <button type="button" onClick={voltarAoFim} className="p-2 font-semibold text-success-ink">Voltar às recentes</button>
      </div>}
      {erro && <p role="alert" className="mb-2 text-sm text-danger-ink">{erro}</p>}
      {!colega.disponivel ? <p className="text-sm text-muted">Este colega está indisponível para receber mensagens.</p> : (
        <form onSubmit={enviar} className="space-y-2">
          {responder && <div className="flex items-center gap-2 rounded border-l-4 border-success-ink bg-surface-muted p-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-success-ink">Respondendo a {responder.remetenteId === eu ? 'você' : colega.nome}</p>
              <p className="truncate">{responder.texto || responder.anexo?.nome}</p>
            </div>
            <button type="button" disabled={enviando} onClick={() => { setResponder(null); pedidoRef.current = null; }}
              aria-label="Cancelar resposta" className="rounded p-2 hover:bg-foreground/10"><X size={17} /></button>
          </div>}
          {arquivo && <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="max-w-full truncate">{arquivo.name}</span>
            <button type="button" disabled={enviando} onClick={() => escolherArquivo(null)} className="text-danger-ink">Remover</button>
            {previewAudio && <audio src={previewAudio} controls aria-label="Ouvir áudio antes de enviar" className="h-9 w-64 max-w-full" />}
          </div>}
          <div className="flex flex-wrap items-end gap-1">
          <input type="file" hidden ref={campoArquivo} accept={FORMATOS_ANEXO_INTERNO.join(',')}
            onChange={evento => escolherArquivo(evento.target.files?.[0] ?? null)} />
          <button type="button" disabled={enviando || gravando || !!arquivo} onClick={() => campoArquivo.current?.click()}
            aria-label="Anexar arquivo" title="Anexar arquivo (até 4 MB)" className="rounded-full p-2.5 text-secondary hover:bg-foreground/5 disabled:opacity-40">
            <Paperclip size={20} aria-hidden="true" />
          </button>
          <textarea ref={campoTexto} hidden={gravando} rows={2} maxLength={limite} aria-label="Mensagem interna" placeholder="Digite sua mensagem…"
            value={texto} readOnly={enviando} onChange={evento => { setTexto(evento.target.value); pedidoRef.current = null; }}
            onKeyDown={evento => {
              if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
                evento.preventDefault();
                if (!evento.repeat) evento.currentTarget.form?.requestSubmit();
              }
            }}
            className="min-w-0 flex-1 resize-none rounded-lg bg-surface-muted p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-success-ink" />
          <GravarAudio disabled={enviando || !!arquivo} onArquivo={escolherArquivo} onGravando={setGravando} onErro={setErro} />
          <button type="submit" disabled={enviando || gravando || (!texto.trim() && !arquivo)} aria-label="Enviar mensagem"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-chat-action text-white disabled:opacity-50"><Send size={18} aria-hidden="true" /></button>
          </div>
        </form>
      )}
    </footer>
  </section>;
}
