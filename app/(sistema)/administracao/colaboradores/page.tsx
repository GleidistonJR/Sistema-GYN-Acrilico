'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Eye, KeyRound, Pencil, Plus, Search, UserMinus, UserPlus } from 'lucide-react';
import { PatternFormat } from 'react-number-format';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';
import ModalRegistro from './ModalRegistro';
import { buscarColaboradores, buscarColaboradorPorId, inativarColaborador, reativarColaborador, type FiltroColaboradores } from './actions';

type Colaborador = Awaited<ReturnType<typeof buscarColaboradores>>[number];
type Edicao = NonNullable<Awaited<ReturnType<typeof buscarColaboradorPorId>>>;

export default function Colaboradores() {
  const [filtro, setFiltro] = useState<FiltroColaboradores>('ativos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState<Edicao | 'novo' | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroAcao, setErroAcao] = useState('');
  const [aviso, setAviso] = useState('');
  const buscar = useCallback(() => buscarColaboradores(busca, filtro), [busca, filtro]);
  const { dados, setDados, atualizar, erro, carregando } = useDadosAtualizados<Colaborador[]>(buscar, []);
  const colaboradores = dados.filter(c => filtro === 'todos' || Boolean(c.inativadoEm) === (filtro === 'inativos'));

  async function editar(id: number) {
    setOcupado(true);
    setErroAcao('');
    try {
      const colaborador = await buscarColaboradorPorId(id);
      if (!colaborador) throw new Error('Colaborador não encontrado.');
      setModal(colaborador);
    } catch {
      setErroAcao('Não foi possível abrir o cadastro.');
    } finally {
      setOcupado(false);
    }
  }

  async function alterarSituacao(colaborador: Colaborador) {
    const reativando = !!colaborador.inativadoEm;
    const confirmacao = reativando
      ? `Reativar ${colaborador.nome}? Você poderá criar um novo login na edição do cadastro.`
      : `Inativar ${colaborador.nome}? O login e as sessões serão removidos. O histórico de ponto será preservado.`;
    if (!window.confirm(confirmacao)) return;
    setOcupado(true);
    setErroAcao('');
    setAviso('');
    try {
      const resultado = await (reativando ? reativarColaborador : inativarColaborador)(colaborador.id);
      if (!resultado.sucesso) {
        setErroAcao(resultado.erro || 'Não foi possível alterar a situação.');
        return;
      }
      setDados(atuais => atuais.map(c => c.id === colaborador.id ? { ...c, inativadoEm: reativando ? null : new Date(), userId: null } : c));
      setAviso(reativando ? 'Colaborador reativado. Crie um novo login em Editar, se precisar.' : 'Colaborador inativado e acesso revogado.');
      await atualizar();
    } catch {
      setErroAcao('Não foi possível confirmar a alteração. Atualize a lista e tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  const acao = 'inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-muted disabled:opacity-50';

  return <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3 py-6">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Colaboradores</h1>
      <div className="flex flex-wrap gap-2">
      <Link href="/administracao/acessos" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-primary-ink hover:bg-surface-muted">
        <KeyRound size={17} /> Acessos avulsos
      </Link>
      <button type="button" disabled={ocupado} onClick={() => { setErroAcao(''); setModal('novo'); }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
        <Plus size={18} /> Adicionar colaborador
      </button>
      </div>
    </div>
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap gap-3 border-b border-line p-3 sm:p-4">
        <label className="flex min-w-40 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-surface-soft px-3">
          <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
          <input aria-label="Buscar por nome ou CPF" placeholder="Buscar por nome ou CPF" value={busca}
            onChange={event => setBusca(event.target.value)} className="min-h-11 w-full bg-transparent text-foreground placeholder:text-muted" />
        </label>
        <select aria-label="Situação do colaborador" value={filtro} onChange={event => setFiltro(event.target.value as FiltroColaboradores)}
          className="min-h-11 rounded-lg border border-line-strong bg-surface-soft px-3 text-foreground">
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>
      {(erroAcao || erro) && <p role="alert" className="px-4 pt-3 text-sm text-danger-ink">{erroAcao || 'Não foi possível atualizar a lista.'}</p>}
      {aviso && <p role="status" className="px-4 pt-3 text-sm text-success-ink">{aviso}</p>}
      {carregando ? <p role="status" className="p-6 text-sm text-muted">Carregando colaboradores…</p>
        : !colaboradores.length ? <p className="p-6 text-sm text-muted">Nenhum colaborador neste filtro.</p>
        : <ul className="divide-y divide-line">
          {colaboradores.map(c => <li key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <Link href={`/administracao/colaboradores/${c.id}`} className="break-words font-semibold text-primary-ink hover:underline">{c.nome}</Link>
              <p className="break-words text-sm text-muted">{c.cargo}</p>
            </div>
            <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:col-start-2 sm:row-start-1">
              <PatternFormat value={c.cpf} format="###.###.###-##" displayType="text" className="text-secondary" />
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.inativadoEm ? 'bg-surface-muted text-secondary' : 'bg-success-soft text-success-ink'}`}>
                {c.inativadoEm ? 'Inativo' : 'Ativo'}
              </span>
              {!c.inativadoEm && !c.userId && <span className="text-xs text-muted">Sem login</span>}
            </div>
            <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-1 sm:col-start-3 sm:row-span-1">
              <Link href={`/administracao/colaboradores/${c.id}`} aria-label={`Histórico de ${c.nome}`} title="Ver histórico" className={acao + ' text-primary-ink'}><Eye size={18} /></Link>
              <button type="button" disabled={ocupado} onClick={() => void editar(c.id)} aria-label={`Editar ${c.nome}`} title="Editar" className={acao + ' text-primary-ink'}><Pencil size={18} /></button>
              {c.inativadoEm ? <button type="button" disabled={ocupado} onClick={() => void alterarSituacao(c)}
                aria-label={`Reativar ${c.nome}`} title="Reativar" className={acao + ' text-success-ink'}><UserPlus size={18} /></button>
                : <button type="button" disabled={ocupado} onClick={() => void alterarSituacao(c)}
                  aria-label={`Inativar ${c.nome}`} title="Inativar" className={acao + ' text-danger-ink'}><UserMinus size={18} /></button>}
            </div>
          </li>)}
        </ul>}
    </div>
    {modal && <ModalRegistro dadosEdicao={modal === 'novo' ? undefined : modal} fechar={() => setModal(null)}
      aoSalvar={() => { setModal(null); void atualizar(); }} />}
  </section>;
}
