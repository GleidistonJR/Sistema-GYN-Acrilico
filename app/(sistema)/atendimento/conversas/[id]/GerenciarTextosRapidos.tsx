'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Plus, X } from 'lucide-react';
import type { TextoRapido } from '../../../components/textosRapidos';

type Alteracao = { modelo: TextoRapido } | { id: string };
const vazio = { id: '', label: '', texto: '' };
const campo = 'mt-1 block w-full rounded-lg border border-line-strong bg-surface-soft p-2.5 text-foreground';

export default function GerenciarTextosRapidos({ textos, fechar, atualizar }: {
  textos: TextoRapido[];
  fechar: () => void;
  atualizar: (alteracao: Alteracao) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useRef<HTMLInputElement>(null);
  const emCurso = useRef(false);
  const idTitulo = useId();
  const [modelo, setModelo] = useState(vazio);
  const [pendente, setPendente] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => { dialogo.current?.showModal(); }, []);

  function selecionar(item: TextoRapido) {
    setModelo(item);
    setConfirmar(false);
    setErro('');
    setAviso('');
    titulo.current?.focus();
  }

  async function salvar(acao: 'criar' | 'editar' | 'excluir') {
    if (emCurso.current) return;
    emCurso.current = true;
    setPendente(true);
    setErro('');
    setAviso('');
    try {
      const resposta = await fetch('/api/textos-rapidos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acao === 'excluir' ? { acao, id: modelo.id } : { acao, ...modelo }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível salvar a alteração.');
      atualizar(dados);
      setModelo(acao === 'excluir' ? vazio : dados.modelo);
      setConfirmar(false);
      setAviso(acao === 'excluir' ? 'Modelo removido.' : 'Modelo salvo.');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a alteração.');
    } finally {
      emCurso.current = false;
      setPendente(false);
    }
  }

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirmar) void salvar(modelo.id ? 'editar' : 'criar');
  }

  return createPortal(<dialog ref={dialogo} aria-labelledby={idTitulo} onClose={fechar}
    onCancel={event => { if (emCurso.current) event.preventDefault(); }}
    className="m-auto max-h-[90dvh] w-[min(94vw,650px)] overscroll-contain rounded-xl border border-line bg-surface p-4 text-foreground shadow-xl backdrop:bg-black/60 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 id={idTitulo} className="text-lg font-semibold">Gerenciar textos rápidos</h2>
      <button type="button" aria-label="Fechar" disabled={pendente} onClick={() => dialogo.current?.close()}
        className="rounded-lg p-2 hover:bg-surface-muted disabled:opacity-50"><X size={20} /></button>
    </div>
    <fieldset disabled={pendente} className="mb-4 space-y-2">
      <button type="button" onClick={() => selecionar(vazio)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary-ink hover:bg-surface-muted">
        <Plus size={17} /> Novo modelo
      </button>
      <ul className="max-h-36 overflow-y-auto rounded-lg border border-line">
        {textos.length ? textos.map(item => <li key={item.id}>
          <button type="button" aria-pressed={modelo.id === item.id} onClick={() => selecionar(item)}
            className="flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted aria-pressed:bg-surface-muted">
            <span className="break-words [overflow-wrap:anywhere]">{item.label}</span><Pencil size={14} className="shrink-0" aria-hidden="true" />
          </button>
        </li>) : <li className="px-3 py-2 text-sm text-muted">Nenhum modelo cadastrado.</li>}
      </ul>
    </fieldset>
    <form onSubmit={enviar}>
      <fieldset disabled={pendente} className="space-y-3">
        <label className="block text-sm font-semibold">Título exibido
          <input ref={titulo} value={modelo.label} required maxLength={80} className={campo}
            onChange={event => setModelo(atual => ({ ...atual, label: event.target.value }))} />
        </label>
        <label className="block text-sm font-semibold">Mensagem
          <textarea value={modelo.texto} required maxLength={6000} rows={5} className={campo}
            onChange={event => setModelo(atual => ({ ...atual, texto: event.target.value }))} />
        </label>
        {confirmar ? <div className="space-y-2 rounded-lg bg-danger-soft p-3 text-sm text-danger-ink">
          <p>Remover este modelo de Atendimento e Orçamentos?</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void salvar('excluir')} className="font-semibold underline">Confirmar remoção</button>
            <button type="button" onClick={() => setConfirmar(false)} className="underline">Cancelar</button>
          </div>
        </div> : <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
            {pendente ? 'Salvando…' : 'Salvar modelo'}
          </button>
          {modelo.id && <button type="button" onClick={() => setConfirmar(true)} className="min-h-11 px-2 text-sm font-semibold text-danger-ink">
            Remover modelo
          </button>}
        </div>}
      </fieldset>
      {erro && <p role="alert" className="mt-3 text-sm text-danger-ink">{erro}</p>}
      {aviso && <p role="status" className="mt-3 text-sm text-success-ink">{aviso}</p>}
    </form>
  </dialog>, document.body);
}
