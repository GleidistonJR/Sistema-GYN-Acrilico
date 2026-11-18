'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, UserPlus, UserMinus, Paperclip, Send, RefreshCw, MoreVertical, Reply, X } from 'lucide-react';
import GravarAudio from './GravarAudio';
import AnexoMensagem from './AnexoMensagem';

type Mensagem = { id: string; texto: string; tipo: string; direcao: string; status: string; erro: string | null; enviadoEm: string;
  externaId: string | null; citacao: { externaId: string | null; texto: string; tipo: string; direcao: string | null } | null;
  autor: { colaborador: { nome: string } | null } | null; midia: { nome: string; mimeType: string } | null;
};
const status: Record<string, string> = { PENDENTE: 'Na fila', ENVIANDO: 'Enviando…', ENVIADA: 'Enviada', ENTREGUE: 'Entregue ✓✓', LIDA: 'Lida ✓✓', FALHOU: 'Falha', INCERTO: 'Sem confirmação', RECEBIDA: 'Recebida' };
const tipos: Record<string, string> = { image: 'Imagem', audio: 'Áudio', ptt: 'Áudio', document: 'Documento', video: 'Vídeo', sticker: 'Figurinha', chat: 'Mensagem', indisponivel: 'Mensagem original indisponível' };
const resumo = (m: { texto: string; tipo: string }) => m.texto || tipos[m.tipo] || 'Mensagem';

function TextoMensagem({ texto }: { texto: string }) {
  const assinatura = texto.match(/^\*([^*\r\n]{1,40}:)\*(?:\n|$)/);
  return assinatura ? <><strong>{assinatura[1]}</strong>{texto.length > assinatura[0].length && <><br />{texto.slice(assinatura[0].length)}</>}</> : <>{texto}</>;
}

export default function Conversa({ cliente, onVoltar, onDetalhes, onLida, onAssumir, onDesatribuir }: {
  cliente: { id: string; nome: string; telefone: string | null };
  onAssumir?: () => Promise<void>;
  onDesatribuir?: () => Promise<void>;
  onVoltar: () => void; onDetalhes: () => void; onLida: (id: string) => void;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [assumindo, setAssumindo] = useState(false);
  const assumindoRef = useRef(false);
  const anexoEnviado = useRef<{ arquivo: File; token: string } | null>(null);
  const [progressoAnexo, setProgressoAnexo] = useState('');
  const [responder, setResponder] = useState<Mensagem | null>(null);
  const [destacada, setDestacada] = useState<string | null>(null);
  const [salto, setSalto] = useState(0);
  const [localizando, setLocalizando] = useState(false);
  const [contexto, setContexto] = useState(false);
  const emContexto = useRef(false);
  const navegacao = useRef<AbortController | null>(null);
  const destaqueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alvoPendente = useRef<string | null>(null);
  const entradaTexto = useRef<HTMLTextAreaElement>(null);
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
  const envioEmCurso = useRef(false);
  const [arrastando, setArrastando] = useState(false);
  const profundidadeDrag = useRef(0);
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

  const ajustarAltura = useCallback(() => {
    const el = entradaTexto.current;
    if (!el || el.hidden) return;
    const css = getComputedStyle(el);
    const bordas = parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth);
    const maximo = parseFloat(css.lineHeight) * 6 + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom) + bordas;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + bordas, maximo)}px`;
    el.style.overflowY = el.scrollHeight + bordas > maximo ? 'auto' : 'hidden';
  }, []);
  useLayoutEffect(ajustarAltura, [texto, gravando, podeEnviar, ajustarAltura]);
  useEffect(() => {
    const el = entradaTexto.current;
    if (!el) return;
    let largura = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (largura !== el.clientWidth) { largura = el.clientWidth; ajustarAltura(); }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ajustarAltura, podeEnviar]);
  useEffect(() => {
    const limpar = () => { profundidadeDrag.current = 0; setArrastando(false); };
    window.addEventListener('drop', limpar); window.addEventListener('dragend', limpar); window.addEventListener('blur', limpar);
    return () => { window.removeEventListener('drop', limpar); window.removeEventListener('dragend', limpar); window.removeEventListener('blur', limpar); };
  }, []);

  const marcarLida = useCallback(async () => {
    const version = versaoEntrada.current;
    if (emContexto.current || marcando.current || BigInt(version) <= BigInt(lidaAte.current) || !seguirFim.current || document.visibilityState !== 'visible' || !document.hasFocus()) return;
    marcando.current = true;
    try {
      const response = await fetch(`${base}/leitura`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ versao: version }) });
      if (response.ok) { lidaAte.current = version; onLida(cliente.id); }
    } finally { marcando.current = false; }
    if (lidaAte.current === version && BigInt(versaoEntrada.current) > BigInt(version)) await marcarLida();
  }, [base, cliente.id, onLida]);

  const atualizar = useCallback(async (antes?: string, signal?: AbortSignal) => {
    if (emContexto.current) return;
    const query = antes ? '?antes=' + encodeURIComponent(antes) : versao.current ? '?versao=' + versao.current : '';
    const resposta = await fetch(`${base}/mensagens${query}`, { cache: 'no-store', signal });
    if (resposta.status === 304) { setPodeEnviar(true); return; }
    const dados = await resposta.json();
    if (!resposta.ok) {
      if (resposta.status === 403) { setMensagens([]); setPodeEnviar(false); }
      throw new Error(dados.erro || 'Não foi possível atualizar a conversa.');
    }
    if (signal?.aborted || emContexto.current) return;
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

  useEffect(() => () => { navegacao.current?.abort(); if (destaqueTimer.current) clearTimeout(destaqueTimer.current); }, []);
  useEffect(() => {
    const id = alvoPendente.current;
    if (!id) return;
    const el = lista.current?.querySelector<HTMLElement>(`[data-mensagem-id="${CSS.escape(id)}"]`);
    if (!el) return;
    alvoPendente.current = null;
    el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
    if (destaqueTimer.current) clearTimeout(destaqueTimer.current);
    destaqueTimer.current = setTimeout(() => setDestacada(null), 3000);
  }, [mensagens, destacada, localizando, salto]);

  async function irParaCitacao(mensagem: Mensagem) {
    navegacao.current?.abort();
    const controller = new AbortController(); navegacao.current = controller;
    setAviso(''); setLocalizando(true); setDestacada(null);
    seguirFim.current = false;
    if (destaqueTimer.current) clearTimeout(destaqueTimer.current);
    try {
      const local = mensagens.find(m => mensagem.citacao?.externaId && m.externaId === mensagem.citacao.externaId);
      let alvo = local?.id;
      if (!alvo) {
        const response = await fetch(`${base}/mensagens?citadaPor=${encodeURIComponent(mensagem.id)}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || 'Não foi possível localizar a mensagem.');
        if (controller.signal.aborted) return;
        emContexto.current = true; setContexto(true);
        setMensagens(data.mensagens); alvo = data.alvoId;
      }
      alvoPendente.current = alvo!; setDestacada(alvo!); setSalto(n => n + 1);
    } catch (error) { if (!controller.signal.aborted) setAviso(error instanceof Error ? error.message : 'Não foi possível localizar a mensagem.'); }
    finally { if (!controller.signal.aborted) setLocalizando(false); }
  }

  async function voltarAoFim() {
    navegacao.current?.abort(); setLocalizando(false); alvoPendente.current = null;
    emContexto.current = false; setContexto(false); setDestacada(null);
    versao.current = ''; carregouHistorico.current = false; seguirFim.current = true;
    setMensagens([]); setCarregando(true);
    try { await atualizar(); } catch { setErro('Não foi possível carregar as mensagens recentes.'); setCarregando(false); }
  }

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
    if (envioEmCurso.current || gravando || !podeEnviar || (!texto.trim() && !arquivo)) return;
    envioEmCurso.current = true;
    setEnviando(true); setErro(''); setAviso('');
    pedido.current ??= crypto.randomUUID();
    const form = new FormData();
    form.set('pedidoId', pedido.current); form.set('texto', texto);

    if (voz && arquivo) form.set('voz', 'true');
    if (responder) form.set('responderId', responder.id);
    try {
      if (arquivo) {
        if (anexoEnviado.current?.arquivo !== arquivo) {
          setProgressoAnexo('Preparando anexo…');
          const grant = await fetch(base + '/anexos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: arquivo.name, mimeType: arquivo.type, tamanho: arquivo.size }) });
          const ticket = await grant.json();
          if (!grant.ok) throw new Error(ticket.erro || 'Não foi possível preparar o anexo.');
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest(); xhr.open('PUT', ticket.url); xhr.timeout = 300000;
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.upload.onprogress = e => setProgressoAnexo(e.lengthComputable ? 'Transferindo anexo: ' + Math.round(e.loaded / e.total * 100) + '%' : 'Transferindo anexo…');
            xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText || 'Falha ao transferir o anexo. Tente novamente.'));
            xhr.onerror = () => reject(new Error('A conexão de arquivos falhou. Confira a internet e tente novamente.'));
            xhr.ontimeout = () => reject(new Error('A transferência demorou demais. Tente novamente.'));
            xhr.send(arquivo);
          });
          anexoEnviado.current = { arquivo, token: ticket.token };
        }
        form.set('uploadToken', anexoEnviado.current.token);
        setProgressoAnexo('Registrando mensagem…');
      }
      const resposta = await fetch(`${base}/mensagens`, { method: 'POST', body: form });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Falha ao enviar.');
      anexoEnviado.current = null;
      setTexto(''); setArquivo(null); setVoz(false); setResponder(null); pedido.current = null;
      if (upload.current) upload.current.value = '';
      seguirFim.current = true;
      if (emContexto.current) void voltarAoFim();
      else if (dados.mensagem) {
        // Show the persisted message immediately; never overwrite a newer SSE status.
        setMensagens(atuais => atuais.some(m => m.id === dados.mensagem.id) ? atuais : [...atuais, dados.mensagem as Mensagem]);
      } else void atualizar().catch(() => setErro('Mensagem registrada. Não foi possível atualizar o histórico agora.'));
    } catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível confirmar. Tente novamente com a mesma mensagem.'); }
    finally { setProgressoAnexo(''); envioEmCurso.current = false; setEnviando(false); requestAnimationFrame(() => entradaTexto.current?.focus()); }
  }

  const anexarArquivos = useCallback((files: File[]) => {
    if (envioEmCurso.current || gravando || !podeEnviar) { setErro('Aguarde o envio ou a gravação terminar antes de anexar um arquivo.'); return; }
    if (arquivo) { setErro('Remova ou envie o anexo selecionado antes de adicionar outro.'); return; }
    if (files.length !== 1) { setErro('Anexe um arquivo por vez.'); return; }
    let file = files[0];
    if (!file.size || file.size > 90 * 1024 * 1024) { setErro('O arquivo deve conter dados e ter até 90 MB.'); return; }
    const tiposArquivo: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'video/mp4', mov: 'video/quicktime', wav: 'audio/wav', webm: 'video/webm' };
    const tipoInformado = file.type.split(';')[0];
    const mime = tipoInformado && tipoInformado !== 'application/octet-stream' ? tipoInformado : tiposArquivo[file.name.split('.').at(-1)?.toLowerCase() || ''];
    if (!mime || (!Object.values(tiposArquivo).includes(mime) && mime !== 'audio/webm')) { setErro('Envie uma imagem, vídeo, áudio ou PDF compatível.'); return; }
    const extensao = Object.keys(tiposArquivo).find(ext => tiposArquivo[ext] === mime) || 'webm';
    const nome = file.name && file.name.includes('.') ? file.name : 'arquivo-colado.' + extensao;
    if (file.type !== mime || file.name !== nome) file = new File([file], nome, { type: mime, lastModified: file.lastModified });
    anexoEnviado.current = null;
    setArquivo(file); setVoz(false); pedido.current = null; setErro('');
    setAviso('Arquivo anexado. Escreva uma legenda se quiser e confirme com Enter ou Enviar.');
    entradaTexto.current?.focus();
  }, [arquivo, gravando, podeEnviar]);

  useEffect(() => {
    const colar = (event: ClipboardEvent) => {
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
      const target = event.target;
      if (target instanceof HTMLElement && target !== entradaTexto.current && target.closest('input, textarea, [contenteditable]')) return;
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const files = clipboard.files.length ? Array.from(clipboard.files) : Array.from(clipboard.items)
        .filter(item => item.kind === 'file').map(item => item.getAsFile()).filter((file): file is File => file !== null);
      if (!files.length) return; // Plain text keeps the browser's normal paste behavior.
      event.preventDefault();
      anexarArquivos(files);
    };
    window.addEventListener('paste', colar);
    return () => window.removeEventListener('paste', colar);
  }, [anexarArquivos]);

  function soltarArquivo(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault(); event.stopPropagation(); profundidadeDrag.current = 0; setArrastando(false);
    anexarArquivos(Array.from(event.dataTransfer.files));
  }

  return <section onDragEnter={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); profundidadeDrag.current++; setArrastando(true); } }}
    onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = enviando || gravando || !podeEnviar || arquivo ? 'none' : 'copy'; } }}
    onDragLeave={e => { if (e.dataTransfer.types.includes('Files')) { profundidadeDrag.current = Math.max(0, profundidadeDrag.current - 1); if (!profundidadeDrag.current) setArrastando(false); } }}
    onDrop={soltarArquivo} className="relative flex h-full min-h-0 flex-1 flex-col bg-[#0b141a] text-[#e9edef]">
    {arrastando && <div role="status" className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-emerald-400 bg-[#0b141a]/95 p-6 text-center"><div><Paperclip size={40} className="mx-auto mb-4 text-emerald-300" /><p className="text-lg font-semibold">{enviando || gravando || !podeEnviar || arquivo ? 'Aguarde para enviar um arquivo' : `Solte para anexar na conversa com ${cliente.nome}`}</p><p className="mt-2 text-sm text-[#8696a0]">Um arquivo por vez · até 90 MB</p></div></div>}
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#202c33] px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><button onClick={onVoltar} aria-label="Voltar aos clientes" className="rounded-lg p-2 hover:bg-white/5 md:hidden"><ArrowLeft size={20} /></button>
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-[#3c5154] text-sm font-semibold text-emerald-200 sm:flex">{cliente.nome.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><h2 className="truncate font-semibold">{cliente.nome}</h2><p className="mt-0.5 truncate text-xs text-[#8696a0]">{cliente.telefone || 'Contato do WhatsApp'}</p></div></div>
      <div className="flex shrink-0 items-center gap-1">{(onAssumir || onDesatribuir) && <button type="button" disabled={assumindo} aria-label={onDesatribuir ? "Desatribuir cliente" : "Assumir cliente"} title={onDesatribuir ? "Remover minha responsabilidade por este cliente" : "Atribuir este cliente a mim"} onClick={async () => {
        if (assumindoRef.current) return;
        assumindoRef.current = true; setAssumindo(true); setErro('');
        try { await (onDesatribuir || onAssumir)?.(); setAviso(onDesatribuir ? 'Cliente sem responsável. Ele continua em Todos os clientes.' : 'Cliente atribuído a você. Ele está em Meus clientes.'); }
        catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível alterar o responsável. Tente novamente.'); }
        finally { assumindoRef.current = false; setAssumindo(false); }
      }} className={`mr-1 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-white disabled:opacity-50 ${onDesatribuir ? 'bg-[#37474f] hover:bg-[#455a64]' : 'bg-[#00a884] hover:bg-emerald-600'}`}>{onDesatribuir ? <UserMinus size={17} /> : <UserPlus size={17} />}<span>{assumindo ? 'Salvando…' : onDesatribuir ? 'Desatribuir' : <>Assumir<span className="hidden lg:inline"> cliente</span></>}</span></button>}<button onClick={sincronizar} disabled={sincronizando} aria-label="Sincronizar histórico" className="rounded-full p-2 text-[#aebac1] hover:bg-white/5 disabled:opacity-50" title="Buscar histórico recente no WhatsApp"><RefreshCw size={18} className={sincronizando ? 'animate-spin' : ''} /></button><button onClick={onDetalhes} aria-label="Organizar cliente" title="Etiquetas e responsável" className="rounded-full p-2 text-[#aebac1] hover:bg-white/5"><MoreVertical size={20} /></button></div>
    </header>
    <div ref={lista} onScroll={() => { const el = lista.current; if (el) seguirFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; if (seguirFim.current) void marcarLida().catch(() => {}); }} className="min-h-0 flex-1 overflow-y-auto p-4 sm:px-8 lg:px-12 [scrollbar-width:thin] [scrollbar-color:#37474f_transparent]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff06 1px, transparent 0)', backgroundSize: '24px 24px' }}>
      {!contexto && anteriores && <button onClick={async () => { seguirFim.current = false; try { await atualizar(mensagens[0]?.id); } catch { setErro('Não foi possível carregar mensagens anteriores.'); } }} className="mx-auto mb-5 block rounded-full bg-[#202c33] px-4 py-2 text-xs text-[#aebac1] shadow-sm">Carregar anteriores</button>}
      {carregando && <p className="p-8 text-center text-sm text-[#8696a0]">Carregando conversa…</p>}
      {!carregando && !mensagens.length && <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-[#202c33] p-6 text-center"><h2 className="font-semibold">Comece a conversa</h2><p className="mt-2 text-sm text-[#8696a0]">Envie uma mensagem abaixo ou use “Sincronizar histórico” para buscar mensagens recentes do WhatsApp.</p></div>}
      <div className="space-y-3">{mensagens.map(m => <article key={m.id} data-mensagem-id={m.id} data-destacada={destacada === m.id ? "true" : undefined} tabIndex={-1} className={`rounded-lg outline-none flex items-start gap-2 ${m.direcao === 'SAIDA' ? 'justify-end' : 'justify-start'}`}>
        <div className={`transition-[filter,box-shadow] duration-300 ${destacada === m.id ? "ring-2 ring-emerald-300 brightness-125" : ""} max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${m.direcao === 'SAIDA' ? 'rounded-tr-sm bg-[#005c4b]' : 'rounded-tl-sm bg-[#202c33]'}`}>
          {m.citacao && <button type="button" onClick={() => void irParaCitacao(m)} title="Ir para a mensagem original" className="mb-2 block w-full max-w-full cursor-pointer text-left hover:bg-black/30 focus-visible:outline-2 focus-visible:outline-emerald-300 rounded border-l-4 border-emerald-400 bg-black/20 px-3 py-2 text-xs" aria-label="Mensagem citada">
            <p className="mb-1 font-semibold text-emerald-300">{m.citacao.direcao === 'SAIDA' ? 'Empresa' : m.citacao.direcao === 'ENTRADA' ? cliente.nome : 'Mensagem original'}</p>
            <p className="line-clamp-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{resumo(m.citacao)}</p>
          </button>}
          {m.midia && <AnexoMensagem id={m.id} midia={m.midia} />}
          {m.texto && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#e9edef] [overflow-wrap:anywhere]">{m.direcao === 'SAIDA' ? <TextoMensagem texto={m.texto} /> : m.texto}</p>}
          {!m.texto && !m.midia && <p className="text-sm italic text-[#8696a0]">Mensagem do tipo {m.tipo}</p>}
          {m.erro && <p className="mt-2 max-w-sm text-xs text-amber-300">{m.erro}</p>}
          <div className="mt-2 flex flex-wrap justify-end gap-2 text-[11px] text-[#8696a0]"><time>{new Date(m.enviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
            {m.direcao === 'SAIDA' && <span className={m.status === 'LIDA' ? 'text-sky-300' : m.status === 'FALHOU' || m.status === 'INCERTO' ? 'text-amber-300' : ''}>{m.autor?.colaborador?.nome ? m.autor.colaborador.nome + ' · ' : ''}{status[m.status] || m.status}</span>}</div>
        </div>
        {m.externaId && podeEnviar && <button type="button" disabled={enviando} aria-label="Responder esta mensagem" title="Responder" onClick={() => { setResponder(m); pedido.current = null; entradaTexto.current?.focus(); }} className="shrink-0 rounded-full p-2 text-[#aebac1] hover:bg-white/10 disabled:opacity-40"><Reply size={17} /></button>}
      </article>)}</div>
    </div>
    {contexto && <div className="flex shrink-0 items-center justify-between gap-2 bg-[#182229] px-4 py-2 text-xs text-[#aebac1]"><span>Trecho da mensagem citada</span><button onClick={() => void voltarAoFim()} className="rounded px-3 py-2 font-semibold text-emerald-300 hover:bg-white/5">Voltar às mensagens recentes</button></div>}
    <footer className="shrink-0 border-t border-white/5 bg-[#202c33] p-3 sm:px-5">
      {localizando && <p role="status" className="mb-2 text-xs text-emerald-300">Localizando mensagem…</p>}
      {progressoAnexo && <p role="status" className="mb-2 text-sm text-emerald-300">{progressoAnexo}</p>}
      {erro && <p role="alert" className="mb-2 text-sm text-red-300">{erro}</p>}
      {aviso && <p role="status" className="mb-2 text-xs text-[#8696a0]">{aviso}</p>}
      {responder && <div aria-label="Respondendo à mensagem" className="mb-3 flex items-center gap-3 rounded-lg border-l-4 border-emerald-400 bg-[#182229] px-3 py-2">
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-emerald-300">Respondendo a {responder.direcao === 'SAIDA' ? 'Empresa' : cliente.nome}</p><p className="mt-1 line-clamp-2 break-words text-xs [overflow-wrap:anywhere]">{resumo(responder)}</p></div>
        <button type="button" disabled={enviando} aria-label="Cancelar resposta" onClick={() => { setResponder(null); pedido.current = null; }} className="shrink-0 rounded p-2 hover:bg-white/10"><X size={18} /></button>
      </div>}
      {!podeEnviar && !carregando ? <p className="p-3 text-center text-sm text-[#aebac1]">Não foi possível habilitar o envio. {erro ? 'Confira o aviso acima.' : 'Atualize a conversa e verifique seu acesso.'}</p> : <form onSubmit={enviar}>
        {arquivo && <div className="mb-2 flex items-center gap-3 text-xs"><span className="truncate">{arquivo.name}</span><button type="button" disabled={enviando} onClick={() => { setArquivo(null); setVoz(false); pedido.current = null; if (upload.current) upload.current.value = ''; }} className="text-red-300">Remover</button></div>}
        {previewAudio && <audio aria-label="Ouvir áudio antes de enviar" controls src={previewAudio} className="mb-3 h-10 w-full max-w-sm" />}
        <div className="flex flex-wrap items-end gap-2"><label className="cursor-pointer rounded-lg p-3 text-[#aebac1] hover:bg-white/5" title="Anexar imagem, vídeo, áudio ou PDF"><Paperclip size={22} /><span className="sr-only">Anexar arquivo</span>
          <input ref={upload} type="file" disabled={enviando || gravando || !podeEnviar} className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif,audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/webm,video/mp4,video/webm,video/quicktime,application/pdf" onChange={e => { const file = e.target.files?.[0]; if (file && file.size > 90 * 1024 * 1024) { setErro('O arquivo deve ter até 90 MB.'); e.target.value = ''; return; } setArquivo(file ?? null); setVoz(false); pedido.current = null; }} /></label>
          <textarea ref={entradaTexto} hidden={gravando} value={texto} onChange={e => { setTexto(e.target.value); pedido.current = null; }} onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); if (!e.repeat) e.currentTarget.form?.requestSubmit(); }
          }} disabled={enviando || gravando || !podeEnviar} maxLength={6000} rows={1} aria-label="Mensagem" placeholder="Digite sua mensagem…" className="min-w-0 flex-1 resize-none rounded-lg border border-transparent bg-[#2a3942] p-3 text-sm leading-5 text-[#e9edef] outline-none placeholder:text-[#8696a0] focus:border-emerald-600" />
          <GravarAudio disabled={enviando || !podeEnviar || !!arquivo} onArquivo={file => { setArquivo(file); setVoz(true); pedido.current = null; }} onGravando={setGravando} onErro={setErro} />
          <button type="submit" disabled={enviando || gravando || !podeEnviar || (!texto.trim() && !arquivo)} className="flex items-center gap-2 rounded-full bg-[#00a884] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"><Send size={18} /><span className="hidden sm:inline">{enviando ? 'Salvando…' : 'Enviar'}</span><span className="sr-only sm:hidden">Enviar</span></button>
        </div><p className="mt-1 text-[10px] text-[#8696a0]">Enter envia · Shift + Enter quebra linha · Ctrl + V ou arraste para anexar; confirme o envio quando terminar (até 90 MB).</p>
      </form>}
    </footer>
  </section>;
}
