'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, UserMinus } from 'lucide-react';
import { ehPerfilAvulso, ESCOPOS_AVULSOS, PERFIS_AVULSOS } from '@/lib/permissoes';
import { criarAcessoAvulso, revogarAcessoAvulso } from './actions';

type Conta = { id: string; email: string; role: string };
const campo = 'mt-1 block min-h-11 w-full rounded-lg border border-line-strong bg-surface-soft px-3 text-foreground';

export default function PainelAcessos({ contas }: { contas: Conta[] }) {
  const emCurso = useRef(false);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function alterar(acao: () => Promise<{ sucesso: boolean; erro?: string }>, mensagem: string) {
    if (emCurso.current) return false;
    emCurso.current = true;
    setPendente(true);
    setErro('');
    setAviso('');
    try {
      const resultado = await acao();
      if (!resultado.sucesso) throw new Error(resultado.erro);
      setAviso(mensagem);
      return true;
    } catch (falha) {
      setErro(falha instanceof Error && falha.message ? falha.message : 'Não foi possível alterar o acesso.');
      return false;
    } finally {
      emCurso.current = false;
      setPendente(false);
    }
  }

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formulario = event.currentTarget;
    const dados = new FormData(formulario);
    if (await alterar(() => criarAcessoAvulso(dados), 'Acesso criado.')) formulario.reset();
  }

  return <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
    <Link href="/administracao/colaboradores" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-ink hover:underline">
      <ArrowLeft size={16} /> Colaboradores
    </Link>
    <h1 className="my-4 text-2xl font-bold text-foreground sm:text-3xl">Acessos avulsos</h1>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <form onSubmit={criar} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><KeyRound size={18} /> Novo acesso</h2>
        <fieldset disabled={pendente} className="space-y-3">
          <label className="block text-sm font-medium">E-mail
            <input type="email" name="email" required maxLength={254} autoComplete="off" className={campo} />
          </label>
          <label className="block text-sm font-medium">Senha
            <input type="password" name="senha" required maxLength={72} autoComplete="new-password" className={campo} />
          </label>
          <label className="block text-sm font-medium">Perfil de acesso
            <select name="role" required defaultValue="" className={campo}>
              <option value="" disabled>Selecione um perfil</option>
              {PERFIS_AVULSOS.map(role => <option key={role} value={role}>{ESCOPOS_AVULSOS[role]}</option>)}
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
            Criar acesso
          </button>
        </fieldset>
      </form>
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="mb-3 font-semibold">Contas criadas</h2>
        {contas.length ? <ul className="divide-y divide-line">
          {contas.map(conta => <li key={conta.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="break-all text-sm font-semibold">{conta.email}</p>
              <p className="text-sm text-muted">{ehPerfilAvulso(conta.role) && ESCOPOS_AVULSOS[conta.role]}</p>
            </div>
            <button type="button" disabled={pendente} aria-label={`Revogar acesso de ${conta.email}`} title="Revogar acesso"
              onClick={() => {
                if (window.confirm(`Revogar o acesso de ${conta.email}? O login e as sessões abertas serão removidos.`)) {
                  void alterar(() => revogarAcessoAvulso(conta.id), 'Acesso revogado.');
                }
              }} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-danger-ink hover:bg-danger-soft disabled:opacity-50">
              <UserMinus size={18} />
            </button>
          </li>)}
        </ul> : <p className="text-sm text-muted">Nenhum acesso avulso cadastrado.</p>}
      </div>
    </div>
    {erro && <p role="alert" className="mt-4 text-sm text-danger-ink">{erro}</p>}
    {aviso && <p role="status" className="mt-4 text-sm text-success-ink">{aviso}</p>}
  </section>;
}
