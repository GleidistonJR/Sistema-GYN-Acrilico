'use client';

import { useActionState, useEffect, type ReactNode } from 'react';
import { alterarAtendimento } from './actions';

export default function Formulario({ acao, clienteId, children, botao, aoSalvar }: {
  acao: string; clienteId?: string; children?: ReactNode; botao: string;
  aoSalvar?: (resultado: Awaited<ReturnType<typeof alterarAtendimento>>) => void;
}) {
  const [estado, action, pendente] = useActionState(alterarAtendimento, { sucesso: false, mensagem: '' });
  useEffect(() => {
    if (!estado.sucesso) return;
    aoSalvar?.(estado);
    window.dispatchEvent(new Event('atendimento:atualizar'));
  }, [estado, aoSalvar]);
  return <form action={action} className="space-y-3">
    <input type="hidden" name="acao" value={acao} />
    {clienteId && <input type="hidden" name="clienteId" value={clienteId} />}
    <fieldset disabled={pendente} className="space-y-3 disabled:opacity-60">
      {children}
      <button className="rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" type="submit">{pendente ? 'Salvando…' : botao}</button>
    </fieldset>
    {estado.mensagem && <p role="status" className={`text-sm ${estado.sucesso ? 'text-emerald-700' : 'text-red-700'}`}>{estado.mensagem}</p>}
  </form>;
}
