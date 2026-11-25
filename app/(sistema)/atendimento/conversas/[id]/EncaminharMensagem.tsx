'use client';

import { useEffect, useRef, useState } from 'react';

type Contato = { id: string; nome: string; telefone: string | null };
type Original = { id: string; texto: string; tipo: string; direcao: string; midia: { nome: string; mimeType: string } | null };

export default function EncaminharMensagem({ original, origem, onFechar, onEnfileirar }: {
  original: Original; origem: string; onFechar: () => void; onEnfileirar: (destino: string) => void;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const envio = useRef<{ destino: string; pedidoId: string; token?: string } | null>(null);
  const ocupado = useRef(false);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [destino, setDestino] = useState<Contato>();
  const [carregando, setCarregando] = useState(true);
  const [erroBusca, setErroBusca] = useState(false);
  const [erro, setErro] = useState('');
  const [progresso, setProgresso] = useState('');

  useEffect(() => { modal.current?.showModal(); }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ fila: 'todos', busca: busca.trim(), pagina: String(pagina) });
        const resposta = await fetch('/api/atendimento/clientes?' + query, { signal: controller.signal });
        if (!resposta.ok) throw new Error();
        const dados = await resposta.json();
        if (controller.signal.aborted) return;
        setContatos(dados.clientes);
        setTemMais(dados.temMais);
      } catch {
        if (!controller.signal.aborted) setErroBusca(true);
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [busca, pagina]);

  function mudarPagina(nova: number) {
    setCarregando(true);
    setErroBusca(false);
    setPagina(nova);
  }

  async function encaminhar() {
    if (!destino || ocupado.current) return;
    ocupado.current = true;
    setErro('');
    setProgresso('Preparando mensagem…');
    try {
      if (envio.current?.destino !== destino.id) envio.current = { destino: destino.id, pedidoId: crypto.randomUUID() };
      const tentativa = envio.current;
      const base = '/api/atendimento/' + encodeURIComponent(destino.id);
      if (original.midia && !tentativa.token) {
        setProgresso('Preparando anexo original…');
        const resposta = await fetch(base + '/anexos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensagemOrigemId: original.id }),
        });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível preparar o anexo original.');
        tentativa.token = dados.token;
      }
      const texto = original.direcao === 'SAIDA' ? original.texto.replace(/^\*[^*\r\n]{1,40}:\*(?:\n|$)/, '') : original.texto;
      const form = new FormData();
      form.set('pedidoId', tentativa.pedidoId);
      form.set('texto', texto);
      if (tentativa.token) form.set('uploadToken', tentativa.token);
      if (original.tipo === 'ptt' && tentativa.token) form.set('voz', 'true');
      setProgresso('Registrando na fila…');
      const resposta = await fetch(base + '/mensagens', { method: 'POST', body: form });
      const dados = await resposta.json();
      if (!resposta.ok) {
        if (resposta.status === 400) tentativa.token = undefined;
        throw new Error(dados.erro || 'Não foi possível encaminhar.');
      }
      onEnfileirar(destino.nome);
      modal.current?.close();
    } catch (falha) {
      setErro(falha instanceof Error && !(falha instanceof TypeError) ? falha.message : 'Não foi possível encaminhar. Confira a conexão e tente novamente.');
    } finally {
      ocupado.current = false;
      setProgresso('');
    }
  }

  return <dialog ref={modal} aria-label="Encaminhar mensagem" onClose={onFechar}
    onCancel={event => { if (ocupado.current) event.preventDefault(); }}
    className="m-auto w-[min(92vw,30rem)] rounded-xl border border-line bg-surface p-4 text-foreground shadow-xl backdrop:bg-black/65">
    <form onSubmit={event => { event.preventDefault(); void encaminhar(); }} className="space-y-3">
      <h2 className="text-lg font-semibold">Encaminhar mensagem</h2>
      <input autoFocus type="search" aria-label="Buscar contato" placeholder="Buscar nome ou telefone" value={busca}
        onChange={event => { setBusca(event.target.value); mudarPagina(1); }} disabled={!!progresso}
        className="w-full rounded-lg border border-line bg-surface-muted p-2 text-sm" />
      <div className="max-h-[36dvh] overflow-auto rounded-lg border border-line" aria-busy={carregando}>
        {carregando ? <p role="status" className="p-3 text-sm">Buscando contatos…</p>
          : erroBusca ? <p role="alert" className="p-3 text-sm">Não foi possível buscar contatos. Altere a busca para tentar novamente.</p>
          : contatos.filter(c => c.id !== origem).map(contato => <label key={contato.id} className="flex cursor-pointer items-center gap-3 p-2.5 hover:bg-surface-muted">
            <input type="radio" name="destino" checked={destino?.id === contato.id} disabled={!!progresso} onChange={() => { setDestino(contato); setErro(''); }} />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{contato.nome}</span>
              {contato.telefone && <span className="block text-xs text-muted">{contato.telefone}</span>}</span>
          </label>)}
        {!carregando && !erroBusca && !contatos.some(c => c.id !== origem) && <p className="p-3 text-sm">Nenhum outro contato encontrado.</p>}
      </div>
      {(pagina > 1 || temMais) && <div className="flex gap-3 text-sm">
        <button type="button" disabled={pagina === 1 || carregando || !!progresso} onClick={() => mudarPagina(pagina - 1)} className="underline disabled:opacity-40">Anterior</button>
        <button type="button" disabled={!temMais || carregando || !!progresso} onClick={() => mudarPagina(pagina + 1)} className="underline disabled:opacity-40">Próxima</button>
      </div>}
      {destino && <p className="text-sm break-words">Enviar para <strong>{destino.nome}</strong></p>}
      {progresso && <p role="status" className="text-sm">{progresso}</p>}
      {erro && <p role="alert" className="text-sm text-warning-ink">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={!!progresso} onClick={() => modal.current?.close()} className="rounded-md px-3 py-2 text-sm disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={!destino || !!progresso} className="rounded-md bg-chat-action px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Encaminhar</button>
      </div>
    </form>
  </dialog>;
}
