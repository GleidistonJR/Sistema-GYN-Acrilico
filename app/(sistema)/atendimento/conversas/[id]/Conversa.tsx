'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronDown, Download, Forward, UserPlus, UserMinus, Paperclip, Send, RefreshCw, MoreVertical, Reply, Trash2, X } from 'lucide-react';
import BaixarAnexo from '../../../BaixarAnexo';
import AvatarContato from '../../AvatarContato';
import GravarAudio from './GravarAudio';
import AnexoMensagem from './AnexoMensagem';
import MenuTextosRapidos from './MenuTextosRapidos';
import EncaminharMensagem from './EncaminharMensagem';
import { transferirAnexo } from './transferirAnexo';

const LIMITE_TEXTO = 6000;

type Mensagem = { id: string; texto: string; tipo: string; direcao: string; status: string; erro: string | null; enviadoEm: string;
  externaId: string | null; autorId: string | null; citacao: { externaId: string | null; texto: string; tipo: string; direcao: string | null } | null;
  autor: { colaborador: { nome: string } | null } | null; midia: { nome: string; mimeType: string; preparadaEm: string | null; tamanho?: number | null } | null;
};
const status: Record<string, string> = { PENDENTE: 'Na fila', ENVIANDO: 'Enviando…', ENVIADA: 'Enviada', ENTREGUE: 'Entregue ✓✓', LIDA: 'Lida ✓✓', FALHOU: 'Falha', INCERTO: 'Sem confirmação', RECEBIDA: 'Recebida' };
const tipos: Record<string, string> = { image: 'Imagem', audio: 'Áudio', ptt: 'Áudio', document: 'Documento', video: 'Vídeo', sticker: 'Figurinha', chat: 'Mensagem', indisponivel: 'Mensagem original indisponível' };
const resumo = (m: { texto: string; tipo: string }) => m.texto || tipos[m.tipo] || 'Mensagem';

function TextoMensagem({ texto }: { texto: string }) {
  const assinatura = texto.match(/^\*([^*\r\n]{1,40}:)\*(?:\n|$)/);
  return assinatura ? <><strong>{assinatura[1]}</strong>{texto.length > assinatura[0].length && <><br />{texto.slice(assinatura[0].length)}</>}</> : <>{texto}</>;
}

export default function Conversa({ cliente, fotoUrl, usuario, onVoltar, onDetalhes, onLida, onAssumir, onDesatribuir }: {
  cliente: { id: string; nome: string; telefone: string | null };
  fotoUrl?: string | null;
  usuario: { id: string; role: string };
  onAssumir?: () => Promise<void>;
  onDesatribuir?: () => Promise<void>;
  onVoltar: () => void; onDetalhes: () => void; onLida: (id: string) => void;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const dialogoFoto = useRef<HTMLDialogElement>(null);
  const [fotoExpandida, setFotoExpandida] = useState(false);
  const [fotoIndisponivel, setFotoIndisponivel] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [assumindo, setAssumindo] = useState(false);
  const assumindoRef = useRef(false);
  const anexoEnviado = useRef<{ arquivo: File; token: string } | null>(null);
  const [progressoAnexo, setProgressoAnexo] = useState('');
  const [responder, setResponder] = useState<Mensagem | null>(null);
  const [encaminhar, setEncaminhar] = useState<Mensagem | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [destacada, setDestacada] = useState<string | null>(null);
  const [salto, setSalto] = useState(0);
  const [localizando, setLocalizando] = useState(false);
  const [contexto, setContexto] = useState(false);
  const [longeDoFim, setLongeDoFim] = useState(false);
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

  async function apagarParaTodos(mensagem: Mensagem) {
    if (apagando || !window.confirm('Apagar esta mensagem para todos no WhatsApp?')) return;
    setApagando(mensagem.id);
    setErro('');
    try {
      const resposta = await fetch(`${base}/mensagens/${mensagem.id}`, { method: 'DELETE' });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível apagar a mensagem.');
      setMensagens(atuais => atuais.map(m => m.id === mensagem.id
        ? { ...m, status: 'APAGADA', texto: '', midia: null, citacao: null, erro: null }
        : m.citacao && m.citacao.externaId === mensagem.externaId
          ? { ...m, citacao: { ...m.citacao, texto: 'Mensagem apagada' } }
          : m));
      setResponder(atual => atual?.id === mensagem.id ? null : atual);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível apagar a mensagem.');
    } finally {
      setApagando(null);
    }
  }

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
    seguirFim.current = true;
    setLongeDoFim(false);
    setDestacada(null);
    if (!emContexto.current) {
      const el = lista.current;
      if (el) el.scrollTop = el.scrollHeight;
      void marcarLida().catch(() => {});
      return;
    }
    emContexto.current = false; setContexto(false);
    versao.current = ''; carregouHistorico.current = false;
    setMensagens([]); setCarregando(true);
    try { await atualizar(); } catch { setErro('Não foi possível carregar as mensagens recentes.'); setCarregando(false); }
  }

  function acompanharRolagem(el: HTMLDivElement) {
    const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight;
    seguirFim.current = distanciaDoFim < 100;
    setLongeDoFim(!seguirFim.current);
    if (seguirFim.current) void marcarLida().catch(() => {});
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

  function inserirTextoRapido(modelo: string) {
    if (envioEmCurso.current || gravando || !podeEnviar) return;
    const rascunho = texto.trimEnd();
    const preenchido = rascunho ? `${rascunho}\n\n${modelo.trim()}` : modelo.trim();
    if (preenchido.length > LIMITE_TEXTO) {
      setErro('O texto rápido excede o limite da mensagem. Encurte o rascunho e tente novamente.');
    } else {
      pedido.current = null;
      setTexto(preenchido);
      setErro('');
    }
    const campo = entradaTexto.current;
    campo?.focus();
    if (campo) requestAnimationFrame(() => campo.setSelectionRange(campo.value.length, campo.value.length));
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
          anexoEnviado.current = { arquivo, token: await transferirAnexo(base, arquivo, setProgressoAnexo) };
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
    onDrop={soltarArquivo} className="relative flex h-full min-h-0 flex-1 flex-col bg-chat-canvas text-foreground">
    {arrastando && <div role="status" className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-emerald-400 bg-chat-canvas/95 p-6 text-center"><div><Paperclip size={40} className="mx-auto mb-4 text-success-ink" /><p className="text-lg font-semibold">{enviando || gravando || !podeEnviar || arquivo ? 'Aguarde para enviar um arquivo' : `Solte para anexar na conversa com ${cliente.nome}`}</p><p className="mt-2 text-sm text-muted">Um arquivo por vez · até 90 MB</p></div></div>}
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1 sm:gap-3"><button onClick={onVoltar} aria-label="Voltar aos clientes" className="shrink-0 rounded-lg p-2 hover:bg-foreground/5 md:hidden"><ArrowLeft size={20} /></button>
        {fotoUrl ? <button type="button" aria-label={`Ampliar foto de ${cliente.nome}`} onClick={() => {
          setFotoIndisponivel(null); setFotoExpandida(true); dialogoFoto.current?.showModal();
        }} className="shrink-0 cursor-zoom-in rounded-full focus-visible:outline-2 focus-visible:outline-emerald-400">
          <AvatarContato nome={cliente.nome} url={fotoUrl} compacto />
        </button> : <AvatarContato nome={cliente.nome} compacto />}
        <div className="min-w-0"><h2 className="truncate font-semibold">{cliente.nome}</h2><p className="mt-0.5 truncate text-xs text-muted">{cliente.telefone || 'Contato do WhatsApp'}</p></div></div>
      <div className="flex shrink-0 items-center gap-1">{(onAssumir || onDesatribuir) && <button type="button" disabled={assumindo} aria-label={onDesatribuir ? "Desatribuir cliente" : "Assumir cliente"} title={onDesatribuir ? "Remover minha responsabilidade por este cliente" : "Atribuir este cliente a mim"} onClick={async () => {
        if (assumindoRef.current) return;
        assumindoRef.current = true; setAssumindo(true); setErro('');
        try { await (onDesatribuir || onAssumir)?.(); setAviso(onDesatribuir ? 'Cliente sem responsável. Ele continua em Todos os clientes.' : 'Cliente atribuído a você. Ele está em Meus clientes.'); }
        catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível alterar o responsável. Tente novamente.'); }
        finally { assumindoRef.current = false; setAssumindo(false); }
      }} className={`mr-1 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-white disabled:opacity-50 ${onDesatribuir ? 'bg-primary hover:bg-primary-hover' : 'bg-chat-action hover:bg-emerald-600'}`}>{onDesatribuir ? <UserMinus size={17} /> : <UserPlus size={17} />}<span>{assumindo ? 'Salvando…' : onDesatribuir ? 'Desatribuir' : <>Assumir<span className="hidden lg:inline"> cliente</span></>}</span></button>}<button onClick={sincronizar} disabled={sincronizando} aria-label="Sincronizar histórico" className="rounded-full p-2 text-secondary hover:bg-foreground/5 disabled:opacity-50" title="Buscar histórico recente no WhatsApp"><RefreshCw size={18} className={sincronizando ? 'animate-spin' : ''} /></button><button onClick={onDetalhes} aria-label="Organizar cliente" title="Etiquetas e responsável" className="rounded-full p-2 text-secondary hover:bg-foreground/5"><MoreVertical size={20} /></button></div>
    </header>
    <dialog ref={dialogoFoto} aria-label={`Foto de ${cliente.nome}`} onClose={() => setFotoExpandida(false)}
      onClick={evento => { if (evento.target === evento.currentTarget) evento.currentTarget.close(); }}
      className="m-auto w-[min(90vw,30rem)] rounded-xl bg-surface p-3 text-foreground shadow-xl backdrop:bg-black/75">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">{cliente.nome}</p>
        <button type="button" autoFocus aria-label="Fechar foto" className="shrink-0 rounded p-2 hover:bg-foreground/10"
          onClick={() => dialogoFoto.current?.close()}><X size={19} /></button>
      </div>
      {fotoExpandida && (fotoUrl && fotoIndisponivel !== fotoUrl
        // eslint-disable-next-line @next/next/no-img-element -- Reutiliza a mesma foto do avatar, sem outro carregador.
        ? <img src={fotoUrl} alt={`Foto de ${cliente.nome}`} referrerPolicy="no-referrer"
          onError={() => setFotoIndisponivel(fotoUrl)} className="mx-auto max-h-[72dvh] w-full rounded-lg object-contain" />
        : <p role="status" className="p-4 text-sm text-muted">Foto indisponível.</p>)}
    </dialog>
    <div ref={lista} tabIndex={-1} onScroll={e => acompanharRolagem(e.currentTarget)} className="min-h-0 flex-1 overflow-y-auto p-4 sm:px-8 lg:px-12 [scrollbar-width:thin] [scrollbar-color:var(--line-strong)_transparent]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--chat-dot) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
      {!contexto && anteriores && <button onClick={async () => { seguirFim.current = false; try { await atualizar(mensagens[0]?.id); } catch { setErro('Não foi possível carregar mensagens anteriores.'); } }} className="mx-auto mb-5 block rounded-full bg-surface px-4 py-2 text-xs text-secondary shadow-sm">Carregar anteriores</button>}
      {carregando && <p className="p-8 text-center text-sm text-muted">Carregando conversa…</p>}
      {!carregando && !mensagens.length && <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-surface p-6 text-center"><h2 className="font-semibold">Comece a conversa</h2><p className="mt-2 text-sm text-muted">Envie uma mensagem abaixo ou use “Sincronizar histórico” para buscar mensagens recentes do WhatsApp.</p></div>}
      <div className="space-y-3">{mensagens.map(m => {
        const legendaRepetida = m.midia && m.texto.replace(/^\*[^*\r\n]{1,40}:\*\s*/, '').trim() === m.midia.nome.trim();
        const podeApagar = podeEnviar && m.direcao === 'SAIDA' && !!m.externaId
          && ['ENVIADA', 'ENTREGUE', 'LIDA'].includes(m.status)
          && (usuario.role === 'ADMIN' || m.autorId === usuario.id);
        const renderMensagem = (baixar?: () => void, baixando = false, feedbackDownload?: ReactNode) => <article key={m.id} data-mensagem-id={m.id} data-destacada={destacada === m.id ? "true" : undefined} tabIndex={-1} className={`rounded-lg outline-none flex items-start gap-2 ${m.direcao === 'SAIDA' ? 'justify-end' : 'justify-start'}`}>
        <div className={`transition-[filter,box-shadow] duration-300 ${destacada === m.id ? "ring-2 ring-emerald-300 brightness-125" : ""} max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${m.direcao === 'SAIDA' ? 'rounded-tr-sm bg-chat-outgoing' : 'rounded-tl-sm bg-surface'}`}>
          {m.status !== 'APAGADA' && (baixar || (podeEnviar && (m.externaId || (!['PENDENTE', 'ENVIANDO'].includes(m.status) && (m.texto || m.midia))))) && <div className="mb-1 flex justify-end">
            <button type="button" aria-label="Opções da mensagem" popoverTarget={`acoes-${m.id}`} disabled={enviando && !baixar}
              onClick={event => {
                const botao = event.currentTarget.getBoundingClientRect();
                const menu = document.getElementById(`acoes-${m.id}`);
                if (!menu) return;
                menu.style.left = `${Math.max(8, Math.min(botao.right - 200, window.innerWidth - 208))}px`;
                menu.style.top = `${Math.max(8, Math.min(botao.bottom + 4, window.innerHeight - 168))}px`;
              }} className="rounded p-1 text-secondary hover:bg-foreground/10 disabled:opacity-40">
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <div id={`acoes-${m.id}`} popover="auto" className="fixed inset-auto m-0 w-[200px] rounded-lg border border-line bg-surface p-1 text-foreground shadow-lg">
              {podeEnviar && m.externaId && <button type="button" disabled={enviando} onClick={event => {
                event.currentTarget.parentElement?.hidePopover();
                setResponder(m); pedido.current = null; entradaTexto.current?.focus();
              }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-muted"><Reply size={16} />Responder</button>}
              {podeEnviar && (m.texto || m.midia) && !['PENDENTE', 'ENVIANDO'].includes(m.status) && <button type="button" disabled={enviando} onClick={event => {
                event.currentTarget.parentElement?.hidePopover();
                setEncaminhar(m);
              }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-muted"><Forward size={16} />Encaminhar</button>}
              {baixar && <button type="button" disabled={baixando} onClick={event => {
                event.currentTarget.parentElement?.hidePopover();
                baixar();
              }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-muted disabled:opacity-50"><Download size={16} aria-hidden="true" />Baixar arquivo</button>}
              {podeApagar && <button type="button" disabled={!!apagando} onClick={event => {
                event.currentTarget.parentElement?.hidePopover();
                void apagarParaTodos(m);
              }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-danger-ink hover:bg-surface-muted disabled:opacity-50"><Trash2 size={16} aria-hidden="true" />Apagar para todos</button>}
            </div>
          </div>}
          {m.citacao && <button type="button" onClick={() => void irParaCitacao(m)} title="Ir para a mensagem original" className="mb-2 block w-full max-w-full cursor-pointer text-left hover:bg-black/30 focus-visible:outline-2 focus-visible:outline-emerald-300 rounded border-l-4 border-emerald-400 bg-black/20 px-3 py-2 text-xs" aria-label="Mensagem citada">
            <p className="mb-1 font-semibold text-success-ink">{m.citacao.direcao === 'SAIDA' ? 'Empresa' : m.citacao.direcao === 'ENTRADA' ? cliente.nome : 'Mensagem original'}</p>
            <p className="line-clamp-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{resumo(m.citacao)}</p>
          </button>}
          {m.midia && baixar && <AnexoMensagem id={m.id} midia={m.midia} baixar={baixar} baixando={baixando} />}
          {feedbackDownload}
          {m.texto && !legendaRepetida && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">{m.direcao === 'SAIDA' ? <TextoMensagem texto={m.texto} /> : m.texto}</p>}
          {!m.texto && !m.midia && <p className="text-sm italic text-muted">{m.status === 'APAGADA' ? 'Mensagem apagada' : `Mensagem do tipo ${m.tipo}`}</p>}
          {apagando === m.id && <p role="status" className="text-xs text-muted">Apagando no WhatsApp…</p>}
          {m.erro && <p className="mt-2 max-w-sm text-xs text-warning-ink">{m.erro}</p>}
          <div className="mt-2 flex flex-wrap justify-end gap-2 text-[11px] text-muted"><time>{new Date(m.enviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
            {m.direcao === 'SAIDA' && <span className={m.status === 'LIDA' ? 'text-info-ink' : m.status === 'FALHOU' || m.status === 'INCERTO' ? 'text-warning-ink' : ''}>{m.autor?.colaborador?.nome ? m.autor.colaborador.nome + ' · ' : ''}{status[m.status] || m.status}</span>}</div>
        </div>
      </article>;
        return m.midia ? <BaixarAnexo key={m.id} url={`/api/atendimento/midia/${m.id}`} nome={m.midia.nome}>{renderMensagem}</BaixarAnexo> : renderMensagem();
      })}</div>
    </div>
    {encaminhar && <EncaminharMensagem original={encaminhar} origem={cliente.id} onFechar={() => setEncaminhar(null)}
      onEnfileirar={destino => { setErro(''); setAviso(`Mensagem colocada na fila para ${destino}.`); }} />}
    {(contexto || longeDoFim) && <div className="relative h-0 shrink-0">
      <button type="button" aria-label="Voltar às mensagens recentes" title="Voltar às mensagens recentes"
        onClick={() => { lista.current?.focus({ preventScroll: true }); void voltarAoFim(); }}
        className="absolute bottom-3 right-4 z-10 grid size-10 place-items-center rounded-full border border-line bg-surface text-secondary shadow-sm hover:bg-surface-muted sm:right-6">
        <ChevronDown size={19} aria-hidden="true" />
      </button>
    </div>}
    {contexto && <p className="shrink-0 bg-surface-muted px-4 py-2 text-xs text-secondary">Trecho da mensagem citada</p>}
    <footer className="shrink-0 border-t border-line bg-surface p-3 sm:px-5">
      {localizando && <p role="status" className="mb-2 text-xs text-success-ink">Localizando mensagem…</p>}
      {progressoAnexo && <p role="status" className="mb-2 text-sm text-success-ink">{progressoAnexo}</p>}
      {erro && <p role="alert" className="mb-2 text-sm text-danger-ink">{erro}</p>}
      {aviso && <p role="status" className="mb-2 text-xs text-muted">{aviso}</p>}
      {responder && <div aria-label="Respondendo à mensagem" className="mb-3 flex items-center gap-3 rounded-lg border-l-4 border-emerald-400 bg-surface-muted px-3 py-2">
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-success-ink">Respondendo a {responder.direcao === 'SAIDA' ? 'Empresa' : cliente.nome}</p><p className="mt-1 line-clamp-2 break-words text-xs [overflow-wrap:anywhere]">{resumo(responder)}</p></div>
        <button type="button" disabled={enviando} aria-label="Cancelar resposta" onClick={() => { setResponder(null); pedido.current = null; }} className="shrink-0 rounded p-2 hover:bg-foreground/10"><X size={18} /></button>
      </div>}
      {!podeEnviar && !carregando ? <p className="p-3 text-center text-sm text-secondary">Não foi possível habilitar o envio. {erro ? 'Confira o aviso acima.' : 'Atualize a conversa e verifique seu acesso.'}</p> : <form onSubmit={enviar}>
        {arquivo && <div className="mb-2 flex items-center gap-3 text-xs"><span className="truncate">{arquivo.name}</span><button type="button" disabled={enviando} onClick={() => { setArquivo(null); setVoz(false); pedido.current = null; if (upload.current) upload.current.value = ''; }} className="text-danger-ink">Remover</button></div>}
        {previewAudio && <audio aria-label="Ouvir áudio antes de enviar" controls src={previewAudio} className="mb-3 h-10 w-full max-w-sm" />}
        <div className="flex flex-wrap items-end gap-2"><label className="cursor-pointer rounded-lg p-3 text-secondary hover:bg-foreground/5" title="Anexar imagem, vídeo, áudio ou PDF"><Paperclip size={22} /><span className="sr-only">Anexar arquivo</span>
          <input ref={upload} type="file" disabled={enviando || gravando || !podeEnviar} className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif,audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/webm,video/mp4,video/webm,video/quicktime,application/pdf" onChange={e => { const file = e.target.files?.[0]; if (file && file.size > 90 * 1024 * 1024) { setErro('O arquivo deve ter até 90 MB.'); e.target.value = ''; return; } setArquivo(file ?? null); setVoz(false); pedido.current = null; }} /></label>
          <MenuTextosRapidos desabilitado={enviando || gravando || !podeEnviar} inserir={inserirTextoRapido} />
          <textarea ref={entradaTexto} hidden={gravando} value={texto} onChange={e => { setTexto(e.target.value); pedido.current = null; }} onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); if (!e.repeat) e.currentTarget.form?.requestSubmit(); }
          }} disabled={enviando || gravando || !podeEnviar} maxLength={LIMITE_TEXTO} rows={1} aria-label="Mensagem" placeholder="Digite sua mensagem…" className="min-w-0 flex-1 resize-none rounded-lg border border-transparent bg-surface-muted p-3 text-sm leading-5 text-foreground outline-none placeholder:text-muted focus:border-emerald-600" />
          <GravarAudio disabled={enviando || !podeEnviar || !!arquivo} onArquivo={file => { setArquivo(file); setVoz(true); pedido.current = null; }} onGravando={setGravando} onErro={setErro} />
          <button type="submit" disabled={enviando || gravando || !podeEnviar || (!texto.trim() && !arquivo)} className="flex items-center gap-2 rounded-full bg-chat-action px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"><Send size={18} /><span className="hidden sm:inline">{enviando ? 'Salvando…' : 'Enviar'}</span><span className="sr-only sm:hidden">Enviar</span></button>
        </div><p className="mt-1 text-[10px] text-muted">Enter envia · Shift + Enter quebra linha · Ctrl + V ou arraste para anexar; confirme o envio quando terminar (até 90 MB).</p>
      </form>}
    </footer>
  </section>;
}
