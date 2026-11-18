'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Paperclip, Send, RefreshCw, MoreVertical } from 'lucide-react';
import GravarAudio from './GravarAudio';

type Mensagem = { id: string; texto: string; tipo: string; direcao: string; status: string; erro: string | null; enviadoEm: string;
  autor: { colaborador: { nome: string } | null } | null; midia: { nome: string; mimeType: string } | null;
};
const status: Record<string, string> = { PENDENTE: 'Na fila', ENVIANDO: 'Enviando…', ENVIADA: 'Enviada', ENTREGUE: 'Entregue ✓✓', LIDA: 'Lida ✓✓', FALHOU: 'Falha', INCERTO: 'Sem confirmação', RECEBIDA: 'Recebida' };

export default function Conversa({ cliente, onVoltar, onDetalhes, onLida }: {
  cliente: { id: string; nome: string; telefone: string | null };
  onVoltar: () => void; onDetalhes: () => void; onLida: (id: string) => void;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [voz, setVoz] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [previewAudio, setPreviewAudio] = useState('');
  useEffect(() => {
    if (!arquivo?.type.startsWith('audio/')) { setPreviewAudio(''); return; }
    const url = URL.createObjectURL(arquivo); setPreviewAudio(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);
  const [enviando, setEnviando] = useState(false);
  const [podeEnviar, setPodeEnviar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [anteriores, setAnteriores] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const pedido = useRef<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const seguirFim = useRef(true);
  const carregouHistorico = useRef(false);
  const versao = useRef('');
  const versaoEntrada = useRef('0');
  const lidaAte = useRef('0');
  const marcando = useRef(false);
  const base = `/api/atendimento/${cliente.id}`;

  const marcarLida = useCallback(async () => {
    const version = versaoEntrada.current;
    if (marcando.current || BigInt(version) <= BigInt(lidaAte.current) || !seguirFim.current || document.visibilityState !== 'visible' || !document.hasFocus()) return;
    marcando.current = true;
    try {
      const response = await fetch(`${base}/leitura`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ versao: version }) });
      if (response.ok) { lidaAte.current = version; onLida(cliente.id); }
    } finally { marcando.current = false; }
    if (lidaAte.current === version && BigInt(versaoEntrada.current) > BigInt(version)) await marcarLida();
  }, [base, cliente.id, onLida]);

  const atualizar = useCallback(async (antes?: string, signal?: AbortSignal) => {
    const query = antes ? '?antes=' + encodeURIComponent(antes) : versao.current ? '?versao=' + versao.current : '';
    const resposta = await fetch(`${base}/mensagens${query}`, { cache: 'no-store', signal });
    if (resposta.status === 304) { setPodeEnviar(true); return; }
    const dados = await resposta.json();
    if (!resposta.ok) {
      if (resposta.status === 403) { setMensagens([]); setPodeEnviar(false); }
      throw new Error(dados.erro || 'Não foi possível atualizar a conversa.');
    }
    if (signal?.aborted) return;
    if (!antes && versao.current && BigInt(dados.versaoMensagens) < BigInt(versao.current)) return;
    if (!antes) { versao.current = dados.versaoMensagens; versaoEntrada.current = dados.versaoEntrada; }
    setPodeEnviar(dados.podeEnviar);
    setMensagens(atuais => {
      const todas = new Map<string, Mensagem>(atuais.map(m => [m.id, m]));
      for (const m of dados.mensagens as Mensagem[]) todas.set(m.id, m);
      return [...todas.values()].sort((a, b) => a.enviadoEm.localeCompare(b.enviadoEm) || a.id.localeCompare(b.id));
    });
    if (antes || !carregouHistorico.current) setAnteriores(dados.temAnteriores);
    if (antes) carregouHistorico.current = true;
    setCarregando(false);
  }, [base]);

  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    let pending = false;
    async function refresh() {
      if (running) { pending = true; return; }
      running = true;
      try { await atualizar(undefined, controller.signal); }
      catch (error) { if (!controller.signal.aborted) { setErro(error instanceof Error ? error.message : 'Falha ao atualizar.'); setCarregando(false); } }
      finally { running = false; if (pending && !controller.signal.aborted) { pending = false; void refresh(); } }
    }
    const invalidate = () => { void refresh(); };
    void refresh();
    window.addEventListener('atendimento:atualizar', invalidate);
    return () => { controller.abort(); window.removeEventListener('atendimento:atualizar', invalidate); };
  }, [atualizar]);
  useEffect(() => {
    if (seguirFim.current && lista.current) lista.current.scrollTop = lista.current.scrollHeight;
    void marcarLida().catch(() => {});
  }, [mensagens, marcarLida]);
  useEffect(() => {
    const read = () => { void marcarLida().catch(() => {}); };
    window.addEventListener('focus', read); document.addEventListener('visibilitychange', read);
    return () => { window.removeEventListener('focus', read); document.removeEventListener('visibilitychange', read); };
  }, [marcarLida]);

  async function sincronizar() {
    setSincronizando(true); setErro('');
    try {
      const resposta = await fetch(`${base}/sincronizar`, { method: 'POST' });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setAviso('Buscando as últimas 50 mensagens disponíveis no WhatsApp. Elas aparecerão automaticamente.');
    } catch (error) { setErro(error instanceof Error ? error.message : 'Falha ao sincronizar.'); }
    finally { setSincronizando(false); }
  }

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (enviando || gravando || !podeEnviar || (!texto.trim() && !arquivo)) return;
    setEnviando(true); setErro(''); setAviso('');
    pedido.current ??= crypto.randomUUID();
    const form = new FormData();
    form.set('pedidoId', pedido.current); form.set('texto', texto);
    if (arquivo) form.set('arquivo', arquivo);
    if (voz && arquivo) form.set('voz', 'true');
    try {
      const resposta = await fetch(`${base}/mensagens`, { method: 'POST', body: form });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Falha ao enviar.');
      setTexto(''); setArquivo(null); setVoz(false); pedido.current = null;
      if (upload.current) upload.current.value = '';
      seguirFim.current = true;
      await atualizar();
    } catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível confirmar. Tente novamente com a mesma mensagem.'); }
    finally { setEnviando(false); }
  }

  return <section className="flex h-full min-h-0 flex-1 flex-col bg-[#0b141a] text-[#e9edef]">
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#202c33] px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><button onClick={onVoltar} aria-label="Voltar aos clientes" className="rounded-lg p-2 hover:bg-white/5 md:hidden"><ArrowLeft size={20} /></button>
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-[#3c5154] text-sm font-semibold text-emerald-200 sm:flex">{cliente.nome.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><h2 className="truncate font-semibold">{cliente.nome}</h2><p className="mt-0.5 text-xs text-[#8696a0]">{cliente.telefone || 'Contato do WhatsApp'}</p></div></div>
      <div className="flex items-center gap-1"><button onClick={sincronizar} disabled={sincronizando} aria-label="Sincronizar histórico" className="rounded-full p-2 text-[#aebac1] hover:bg-white/5 disabled:opacity-50" title="Buscar histórico recente no WhatsApp"><RefreshCw size={18} className={sincronizando ? 'animate-spin' : ''} /></button><button onClick={onDetalhes} aria-label="Organizar cliente" title="Etiquetas e responsável" className="rounded-full p-2 text-[#aebac1] hover:bg-white/5"><MoreVertical size={20} /></button></div>
    </header>
    <div ref={lista} onScroll={() => { const el = lista.current; if (el) seguirFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; if (seguirFim.current) void marcarLida().catch(() => {}); }} className="min-h-0 flex-1 overflow-y-auto p-4 sm:px-8 lg:px-12 [scrollbar-width:thin] [scrollbar-color:#37474f_transparent]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff06 1px, transparent 0)', backgroundSize: '24px 24px' }}>
      {anteriores && <button onClick={async () => { seguirFim.current = false; try { await atualizar(mensagens[0]?.id); } catch { setErro('Não foi possível carregar mensagens anteriores.'); } }} className="mx-auto mb-5 block rounded-full bg-[#202c33] px-4 py-2 text-xs text-[#aebac1] shadow-sm">Carregar anteriores</button>}
      {carregando && <p className="p-8 text-center text-sm text-[#8696a0]">Carregando conversa…</p>}
      {!carregando && !mensagens.length && <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-[#202c33] p-6 text-center"><h2 className="font-semibold">Comece a conversa</h2><p className="mt-2 text-sm text-[#8696a0]">Envie uma mensagem abaixo ou use “Sincronizar histórico” para buscar mensagens recentes do WhatsApp.</p></div>}
      <div className="space-y-3">{mensagens.map(m => <article key={m.id} className={`flex ${m.direcao === 'SAIDA' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${m.direcao === 'SAIDA' ? 'rounded-tr-sm bg-[#005c4b]' : 'rounded-tl-sm bg-[#202c33]'}`}>
          {m.midia?.mimeType.startsWith('image/') && <a href={`/api/atendimento/midia/${m.id}`} target="_blank" rel="noreferrer">
            {/* Authenticated media must not be sent through a shared image cache. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/atendimento/midia/${m.id}`} alt={m.midia.nome} className="mb-2 max-h-80 max-w-full rounded-lg object-contain" loading="lazy" />
          </a>}
          {m.midia?.mimeType.startsWith('audio/') && <audio controls preload="none" className="mb-2 max-w-full" src={`/api/atendimento/midia/${m.id}?arquivo=${encodeURIComponent(m.midia.nome)}`} />}
          {m.midia && <a href={`/api/atendimento/midia/${m.id}`} download={m.midia.nome} className="mb-2 block break-all text-xs font-semibold underline">{m.midia.nome}</a>}
          {m.texto && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#e9edef] [overflow-wrap:anywhere]">{m.texto}</p>}
          {!m.texto && !m.midia && <p className="text-sm italic text-[#8696a0]">Mensagem do tipo {m.tipo}</p>}
          {m.erro && <p className="mt-2 max-w-sm text-xs text-amber-300">{m.erro}</p>}
          <div className="mt-2 flex flex-wrap justify-end gap-2 text-[11px] text-[#8696a0]"><time>{new Date(m.enviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
            {m.direcao === 'SAIDA' && <span className={m.status === 'LIDA' ? 'text-sky-300' : m.status === 'FALHOU' || m.status === 'INCERTO' ? 'text-amber-300' : ''}>{m.autor?.colaborador?.nome ? m.autor.colaborador.nome + ' · ' : ''}{status[m.status] || m.status}</span>}</div>
        </div>
      </article>)}</div>
    </div>
    <footer className="shrink-0 border-t border-white/5 bg-[#202c33] p-3 sm:px-5">
      {erro && <p role="alert" className="mb-2 text-sm text-red-300">{erro}</p>}
      {aviso && <p role="status" className="mb-2 text-xs text-[#8696a0]">{aviso}</p>}
      {!podeEnviar && !carregando ? <p className="p-3 text-center text-sm text-[#aebac1]">Não foi possível habilitar o envio. {erro ? 'Confira o aviso acima.' : 'Atualize a conversa e verifique seu acesso.'}</p> : <form onSubmit={enviar}>
        {arquivo && <div className="mb-2 flex items-center gap-3 text-xs"><span className="truncate">{arquivo.name}</span><button type="button" disabled={enviando} onClick={() => { setArquivo(null); setVoz(false); pedido.current = null; if (upload.current) upload.current.value = ''; }} className="text-red-300">Remover</button></div>}
        {previewAudio && <audio aria-label="Ouvir áudio antes de enviar" controls src={previewAudio} className="mb-3 h-10 w-full max-w-sm" />}
        <div className="flex flex-wrap items-end gap-2"><label className="cursor-pointer rounded-lg p-3 text-[#aebac1] hover:bg-white/5" title="Anexar imagem, áudio ou PDF"><Paperclip size={22} /><span className="sr-only">Anexar arquivo</span>
          <input ref={upload} type="file" disabled={enviando || gravando || !podeEnviar} className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif,audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/webm,application/pdf" onChange={e => { const file = e.target.files?.[0]; if (file && file.size > 10 * 1024 * 1024) { setErro('O arquivo deve ter até 10 MB.'); e.target.value = ''; return; } setArquivo(file ?? null); setVoz(false); pedido.current = null; }} /></label>
          <textarea hidden={gravando} value={texto} onChange={e => { setTexto(e.target.value); pedido.current = null; }} disabled={enviando || gravando || !podeEnviar} maxLength={6000} rows={1} aria-label="Mensagem" placeholder="Digite sua mensagem…" className="max-h-40 min-w-0 flex-1 resize-y rounded-lg border border-transparent bg-[#2a3942] p-3 text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0] focus:border-emerald-600" />
          <GravarAudio disabled={enviando || !podeEnviar || !!arquivo} onArquivo={file => { setArquivo(file); setVoz(true); pedido.current = null; }} onGravando={setGravando} onErro={setErro} />
          <button type="submit" disabled={enviando || gravando || !podeEnviar || (!texto.trim() && !arquivo)} className="flex items-center gap-2 rounded-full bg-[#00a884] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"><Send size={18} /><span className="hidden sm:inline">{enviando ? 'Salvando…' : 'Enviar'}</span><span className="sr-only sm:hidden">Enviar</span></button>
        </div><p className="mt-1 text-[10px] text-[#8696a0]">Imagens, áudio e PDF até 10 MB. O estado de envio aparece em cada mensagem.</p>
      </form>}
    </footer>
  </section>;
}
