'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Plus, UserRound, MessageCircle, Tags, Settings2, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import Formulario from './Formulario';
import AvatarContato from './AvatarContato';
import { useFotosContatos } from './useFotosContatos';

const Conversa = dynamic(() => import('./conversas/[id]/Conversa'), { loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-400">Abrindo conversa…</div> });
type Cliente = { id: string; nome: string; telefone: string | null; responsavelId: string | null; naoLida: boolean; responsavelNome?: string | null };
type Etiqueta = { id: string; nome: string };
type Detalhes = { cliente: Cliente; etiquetas: Etiqueta[]; selecionadas: string[]; vendedores: { id: string; email: string; colaborador: { nome: string } | null }[] };
const campo = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800';

function Dialogo({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onClose={fechar} className="m-auto max-h-[85dvh] w-[min(92vw,440px)] overflow-y-auto rounded-2xl border-0 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-black/60">
    <div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">{titulo}</h2><button onClick={() => ref.current?.close()} aria-label="Fechar" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></div>
    {children}
  </dialog>;
}

export default function PainelAtendimento({ usuario, etiquetas, filaInicial, clienteInicial }: {
  usuario: { id: string; role: string; apelido?: string }; etiquetas: Etiqueta[]; filaInicial: string; clienteInicial?: string;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const fotos = useFotosContatos(clientes.map(c => c.id));
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [fila, setFila] = useState(filaInicial);
  const [busca, setBusca] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [filtros, setFiltros] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [mais, setMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [online, setOnline] = useState(false);
  const [modal, setModal] = useState<'cliente' | 'etiqueta' | 'detalhes' | 'apelido' | null>(null);
  const [detalhes, setDetalhes] = useState<Detalhes | null>(null);
  const [erroDetalhes, setErroDetalhes] = useState('');
  const entrada = useRef(clienteInicial);
  const requestId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const busy = useRef<string | null>(null);
  const pending = useRef(false);
  const selectedId = selecionado?.id;

  useEffect(() => {
    const drag = (event: DragEvent) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); };
    const drop = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault(); setErro('Abra uma conversa e solte o arquivo sobre ela para anexar.');
    };
    window.addEventListener('dragover', drag); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', drag); window.removeEventListener('drop', drop); };
  }, []);

  const escolher = useCallback((cliente: Cliente | null) => {
    setSelecionado(cliente);
    const url = new URL(window.location.href);
    if (cliente) url.searchParams.set('cliente', cliente.id); else url.searchParams.delete('cliente');
    window.history.replaceState(null, '', url);
  }, []);
  const marcarLida = useCallback((id: string) => setClientes(atuais => atuais.map(c => c.id === id ? { ...c, naoLida: false } : c)), []);

  const carregar = useCallback(async () => {
    const key = JSON.stringify([fila, busca, etiqueta, pagina]);
    if (busy.current === key) { pending.current = true; return; }
    busy.current = key;
    const version = ++requestId.current;
    abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    try {
      const params = new URLSearchParams({ fila, busca, etiqueta, pagina: String(pagina) });
      const response = await fetch('/api/atendimento/clientes?' + params, { cache: 'no-store', signal: controller.signal });
      const data = await response.json();
      if (!response.ok) { if (response.status === 401) { setClientes([]); setSelecionado(null); } throw new Error(data.erro || 'Não foi possível carregar os clientes.'); }
      if (version !== requestId.current) return;
      setClientes(data.clientes); setMais(data.temMais); setErro('');
      setSelecionado(atual => atual ? data.clientes.find((c: Cliente) => c.id === atual.id) || atual : atual);
      if (entrada.current) {
        const id = entrada.current; entrada.current = undefined;
        const local = data.clientes.find((c: Cliente) => c.id === id);
        if (local) escolher(local);
        else {
          const details = await fetch(`/api/atendimento/${encodeURIComponent(id)}/detalhes`, { signal: controller.signal });
          if (details.ok && version === requestId.current) escolher({ ...(await details.json()).cliente, naoLida: false });
        }
      }
    } catch (error) { if (!controller.signal.aborted) setErro(error instanceof Error ? error.message : 'Falha na atualização.'); }
    finally { if (version === requestId.current) { busy.current = null; setCarregando(false); if (pending.current) { pending.current = false; void carregar(); } } }
  }, [fila, busca, etiqueta, pagina, escolher]);

  useEffect(() => {
    const requests = requestId;
    const timer = setTimeout(() => void carregar(), busca ? 250 : 0);
    let refresh: ReturnType<typeof setTimeout>;
    const invalidate = () => { clearTimeout(refresh); refresh = setTimeout(() => void carregar(), 100); };
    window.addEventListener('atendimento:atualizar', invalidate);
    return () => { clearTimeout(timer); clearTimeout(refresh); requests.current++; busy.current = null; pending.current = false; abort.current?.abort(); window.removeEventListener('atendimento:atualizar', invalidate); };
  }, [carregar, busca]);

  useEffect(() => {
    let source: EventSource | null = null;
    let connected = false;
    const invalidate = () => window.dispatchEvent(new Event('atendimento:atualizar'));
    function connect() {
      source?.close();
      if (document.visibilityState === 'hidden') { connected = false; return; }
      source = new EventSource('/api/atendimento/eventos');
      source.addEventListener('pronto', () => { connected = true; setOnline(true); });
      source.onerror = () => { connected = false; setOnline(false); };
      source.addEventListener('atualizar', invalidate);
    }
    const fallback = setInterval(() => { if (!connected && document.visibilityState === 'visible') invalidate(); }, 5000);
    const visibility = () => { connect(); if (document.visibilityState === 'visible') invalidate(); };
    connect();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', invalidate);
    return () => { source?.close(); clearInterval(fallback); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('focus', invalidate); };
  }, []);

  useEffect(() => {
    if (modal !== 'detalhes' || !selectedId) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const r = await fetch(`/api/atendimento/${selectedId}/detalhes`, { signal: controller.signal, cache: 'no-store' });
        if (!r.ok) throw new Error('Não foi possível carregar este cliente.');
        const data = await r.json();
        setDetalhes(data); setErroDetalhes('');
        setSelecionado(atual => atual?.id === data.cliente.id ? { ...atual, ...data.cliente } : atual);
      } catch { if (!controller.signal.aborted) setErroDetalhes('Não foi possível carregar este cliente.'); }
    };
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('atendimento:atualizar', refresh);
    return () => { controller.abort(); window.removeEventListener('atendimento:atualizar', refresh); };
  }, [modal, selectedId]);

  function abrirDetalhes() { setDetalhes(null); setErroDetalhes(''); setModal('detalhes'); }
  const editar = detalhes && (usuario.role === 'ADMIN' || detalhes.cliente.responsavelId === usuario.id);

  return <div className="flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden bg-[#111b21] text-[#e9edef]">
    <aside aria-label="Lista de clientes" className={`${selecionado ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-white/10 bg-[#111b21] md:w-[320px] lg:w-[360px] xl:w-[390px]`}>
      <div className="flex h-[72px] shrink-0 items-center justify-between px-5"><h1 className="text-xl font-semibold tracking-tight">Atendimento</h1>
        <div className="flex items-center gap-2"><span title={online ? 'Atualização em tempo real ativa' : 'Reconectando atualização automática'} className={`size-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} aria-label={online ? 'Tempo real ativo' : 'Reconectando'} />
          <button onClick={() => setModal('cliente')} title="Novo cliente" aria-label="Novo cliente" className="rounded-full bg-[#00a884] p-2 text-[#111b21] hover:bg-emerald-400"><Plus size={20} /></button></div>
      </div>
      <div className="space-y-3 px-4 pb-4">
        <button onClick={() => setModal('apelido')} aria-label="Meu apelido" className="max-w-full truncate text-left text-xs text-emerald-300 hover:underline">Meu apelido: {usuario.apelido || 'Atendimento'}</button>
        <label className="flex items-center gap-3 rounded-lg bg-[#202c33] px-3 py-2.5 text-[#8696a0]"><Search size={17} /><input aria-label="Buscar cliente" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar nome ou telefone" className="min-w-0 flex-1 bg-transparent text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]" /></label>
        <div className="flex items-center gap-2">
          <select aria-label="Carteira de clientes" value={fila} onChange={e => { setFila(e.target.value); setPagina(1); const url = new URL(window.location.href); url.searchParams.set('fila', e.target.value); window.history.replaceState(null, '', url); }} className="min-w-0 flex-1 cursor-pointer rounded-lg border border-white/10 bg-[#202c33] px-3 py-2 text-sm outline-none focus:border-emerald-500">
            <option value="meus">Meus clientes</option><option value="fila">Fila compartilhada</option><option value="todos">Todos os clientes</option>
          </select>
          <button onClick={() => setFiltros(!filtros)} aria-label="Filtrar por etiqueta" aria-expanded={filtros} className={`rounded-lg p-2.5 ${etiqueta ? 'bg-emerald-900 text-emerald-300' : 'bg-[#202c33] text-[#8696a0]'}`}><SlidersHorizontal size={18} /></button>
        </div>
        {filtros && <select aria-label="Etiqueta" value={etiqueta} onChange={e => { setEtiqueta(e.target.value); setPagina(1); }} className="w-full rounded-lg bg-[#202c33] p-2 text-sm"><option value="">Todas as etiquetas</option>{etiquetas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#37474f_transparent]">
        {erro && <p role="alert" className="px-5 py-3 text-xs text-amber-300">{erro}</p>}
        {carregando && <p className="p-8 text-center text-sm text-[#8696a0]">Carregando clientes…</p>}
        {!carregando && !clientes.length && <p className="p-8 text-center text-sm text-[#8696a0]">Nenhum cliente nesta lista.</p>}
        {clientes.map(c => <button key={c.id} data-cliente-id={c.id} onClick={() => escolher(c)} aria-label={`Conversar com ${c.nome}${c.naoLida ? ', mensagens não lidas' : ''}`} aria-current={selecionado?.id === c.id ? 'true' : undefined}
          className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 ${selecionado?.id === c.id ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}>
          <AvatarContato nome={c.nome} url={fotos[c.id]} />
          <span className="min-w-0 flex-1"><span className={`block truncate text-[15px] ${c.naoLida ? 'font-semibold text-white' : 'text-[#e9edef]'}`}>{c.nome}</span><span className="mt-1 block truncate text-xs text-[#8696a0]">{c.telefone || 'Contato do WhatsApp'}</span></span>
          {fila === 'todos' && <span role="img" title={c.responsavelNome ? `Responsável: ${c.responsavelNome}` : 'Sem responsável · fila compartilhada'} aria-label={c.responsavelNome ? `Responsável: ${c.responsavelNome}` : 'Sem responsável'} className={c.responsavelId ? 'shrink-0 text-sky-300' : 'shrink-0 text-[#8696a0]'}><UserRound size={17} /></span>}
          {c.naoLida && <span role="img" aria-label="Mensagens não lidas" className="size-2.5 shrink-0 rounded-full bg-[#00d084]" />}
        </button>)}
      </div>
      <div className="flex h-14 shrink-0 items-center justify-between border-t border-white/10 px-4 text-[#8696a0]">
        <div className="flex items-center gap-3"><button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)} aria-label="Página anterior" className="rounded p-1 disabled:opacity-25"><ChevronLeft size={18} /></button><span className="text-xs">{pagina}</span><button disabled={!mais} onClick={() => setPagina(p => p + 1)} aria-label="Próxima página" className="rounded p-1 disabled:opacity-25"><ChevronRight size={18} /></button></div>
        {usuario.role === 'ADMIN' && <div className="flex gap-2"><button onClick={() => setModal('etiqueta')} aria-label="Criar etiqueta" title="Criar etiqueta" className="rounded p-2 hover:bg-white/5"><Tags size={18} /></button><Link href="/atendimento/conexao" aria-label="Conexão WhatsApp" title="Conexão WhatsApp" className="rounded p-2 hover:bg-white/5"><Settings2 size={18} /></Link></div>}
      </div>
    </aside>
    <main className={`${selecionado ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col`}>
      {selecionado ? <Conversa key={selecionado.id} cliente={selecionado} onVoltar={() => escolher(null)} onDetalhes={abrirDetalhes} onLida={marcarLida} /> : <div className="flex h-full flex-col items-center justify-center border-b-4 border-[#00a884] bg-[#222e35] p-8 text-center"><div className="mb-6 rounded-full bg-[#2a3942] p-7"><MessageCircle size={56} strokeWidth={1.2} className="text-[#00a884]" /></div><h2 className="text-2xl font-light text-[#e9edef]">Suas conversas, em um só lugar</h2><p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8696a0]">Selecione um cliente à esquerda para conversar.<br />A bolinha verde indica mensagens ainda não visualizadas.</p></div>}
    </main>
    {modal && <Dialogo titulo={modal === 'apelido' ? 'Meu apelido' : modal === 'cliente' ? 'Novo cliente' : modal === 'etiqueta' ? 'Nova etiqueta' : 'Organizar cliente'} fechar={() => setModal(null)}>
      {modal === 'apelido' && <Formulario acao="meuApelido" botao="Salvar apelido">
        <label className="block text-sm">Apelido para o cliente<input name="apelido" required maxLength={40} defaultValue={usuario.apelido || 'Atendimento'} className={campo} autoFocus autoComplete="nickname" placeholder="Ex.: Junior" /></label>
        <p className="text-xs text-slate-500">Nas próximas mensagens, seu apelido aparecerá em negrito acima do texto. Vale para textos e legendas de imagens/PDFs; áudios não recebem cabeçalho.</p>
        <div className="rounded-lg bg-emerald-50 p-3 text-sm"><strong>{usuario.apelido || 'Atendimento'}:</strong><br />Mensagem normal</div>
        <p className="text-xs text-slate-500">Esta configuração pertence ao seu login e funciona em todos os computadores.</p>
      </Formulario>}
      {modal === 'cliente' && <Formulario acao="criarCliente" botao="Adicionar à fila"><label className="block text-sm">Nome<input name="nome" required maxLength={120} className={campo} autoFocus /></label><label className="block text-sm">WhatsApp com país e DDD<input name="telefone" required type="tel" className={campo} placeholder="+55 62 99999-9999" /></label></Formulario>}
      {modal === 'etiqueta' && <Formulario acao="criarEtiqueta" botao="Criar etiqueta"><label className="block text-sm">Nome<input name="nome" required maxLength={40} className={campo} autoFocus /></label></Formulario>}
      {modal === 'detalhes' && <div className="space-y-6">{erroDetalhes ? <p role="alert" className="text-sm text-red-700">{erroDetalhes}</p> : !detalhes ? <p className="text-sm text-slate-500">Carregando…</p> : <>
        <div><h3 className="font-semibold">{detalhes.cliente.nome}</h3><p className="text-sm text-slate-500">{detalhes.cliente.telefone}</p></div>
        <Formulario acao="renomear" clienteId={detalhes.cliente.id} botao="Salvar nome">
          <label className="block text-sm">Nome do contato<input name="nome" required maxLength={120} defaultValue={detalhes.cliente.nome} className={campo} autoComplete="off" /></label>
          <p className="text-xs text-slate-500">Este nome será exibido para todos os usuários com acesso ao contato.</p>
        </Formulario>
        {!detalhes.cliente.responsavelId && <Formulario acao="assumir" clienteId={detalhes.cliente.id} botao="Assumir cliente" />}
        {editar && <>
          {!!detalhes.etiquetas.length && <Formulario acao="etiquetar" clienteId={detalhes.cliente.id} botao="Adicionar etiqueta"><label className="block text-sm">Etiqueta<select name="etiquetaId" className={campo}>{detalhes.etiquetas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label></Formulario>}
          {!!detalhes.selecionadas.length && <Formulario acao="removerEtiqueta" clienteId={detalhes.cliente.id} botao="Remover etiqueta"><label className="block text-sm">Etiqueta atual<select name="etiquetaId" className={campo}>{detalhes.etiquetas.filter(e => detalhes.selecionadas.includes(e.id)).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label></Formulario>}
          {usuario.role === 'ADMIN' && <Formulario acao="transferir" clienteId={detalhes.cliente.id} botao="Alterar responsável"><label className="block text-sm">Responsável<select name="responsavelId" defaultValue={detalhes.cliente.responsavelId ?? ''} className={campo}><option value="">Devolver à fila</option>{detalhes.vendedores.map(v => <option key={v.id} value={v.id}>{v.colaborador?.nome || v.email}</option>)}</select></label></Formulario>}
        </>}
      </>}</div>}
    </Dialogo>}
  </div>;
}
