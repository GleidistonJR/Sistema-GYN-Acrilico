'use client';

import { useState } from 'react';
import { alterarAtendimento } from './actions';

type Etiqueta = { id: string; nome: string };
type Props = {
  clienteId: string;
  etiquetas: Etiqueta[];
  selecionadas: string[];
  aoSalvar: (etiquetaId: string, marcada: boolean) => void;
};

export default function EtiquetasCliente({ clienteId, etiquetas, selecionadas, aoSalvar }: Props) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-semibold">Etiquetas</legend>
    {etiquetas.length ? <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
      {etiquetas.map(etiqueta => <OpcaoEtiqueta key={etiqueta.id} etiqueta={etiqueta} clienteId={clienteId}
        marcada={selecionadas.includes(etiqueta.id)} aoSalvar={aoSalvar} />)}
    </ul> : <p className="text-sm text-muted">Nenhuma etiqueta cadastrada.</p>}
  </fieldset>;
}

function OpcaoEtiqueta({ etiqueta, clienteId, marcada, aoSalvar }: {
  etiqueta: Etiqueta; clienteId: string; marcada: boolean; aoSalvar: Props['aoSalvar'];
}) {
  const [pendente, setPendente] = useState<boolean | null>(null);
  const [erro, setErro] = useState('');

  async function alterar(checked: boolean) {
    if (pendente !== null) return;
    setPendente(checked);
    setErro('');
    try {
      const form = new FormData();
      form.set('acao', checked ? 'etiquetar' : 'removerEtiqueta');
      form.set('clienteId', clienteId);
      form.set('etiquetaId', etiqueta.id);
      const resultado = await alterarAtendimento({ sucesso: false, mensagem: '' }, form);
      if (!resultado.sucesso) throw new Error(resultado.mensagem);
      aoSalvar(etiqueta.id, checked);
      window.dispatchEvent(new Event('atendimento:atualizar'));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a etiqueta.');
    } finally {
      setPendente(null);
    }
  }

  return <li>
    <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-surface-muted">
      <input type="checkbox" checked={pendente ?? marcada} disabled={pendente !== null}
        onChange={event => void alterar(event.target.checked)} className="size-4 shrink-0 accent-chat-action" />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{etiqueta.nome}</span>
    </label>
    {erro && <p role="alert" className="px-3 pb-2 text-xs text-danger-ink">{erro}</p>}
  </li>;
}
