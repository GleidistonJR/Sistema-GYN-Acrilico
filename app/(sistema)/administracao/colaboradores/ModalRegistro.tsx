'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { PatternFormat } from 'react-number-format';
import { salvarColaborador, type DadosColaborador } from './actions';

type Edicao = DadosColaborador & { inativadoEm: Date | null; user: { email: string; role: string } | null };
const campo = 'mt-1 block w-full rounded-lg border border-line-strong bg-surface-soft p-2.5 text-foreground';

export default function ModalRegistro({ dadosEdicao, fechar, aoSalvar }: {
  dadosEdicao?: Edicao;
  fechar: () => void;
  aoSalvar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const enviando = useRef(false);
  const titulo = useId();
  const [cpf, setCpf] = useState(dadosEdicao?.cpf ?? '');
  const [erro, setErro] = useState('');
  const [pendente, setPendente] = useState(false);
  const ativo = !dadosEdicao?.inativadoEm;
  const temLogin = !!dadosEdicao?.user;

  useEffect(() => { dialogo.current?.showModal(); }, []);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando.current) return;
    const dados = new FormData(event.currentTarget);
    enviando.current = true;
    setPendente(true);
    setErro('');
    try {
      const resultado = await salvarColaborador({
        id: dadosEdicao?.id,
        nome: String(dados.get('nome') ?? ''),
        cargo: String(dados.get('cargo') ?? ''),
        cpf,
        email: String(dados.get('email') ?? ''),
        senha: String(dados.get('senha') ?? ''),
        role: String(dados.get('role') ?? 'USER'),
      });
      if (resultado.sucesso) aoSalvar();
      else setErro(resultado.erro || 'Não foi possível salvar o colaborador.');
    } catch {
      setErro('Não foi possível salvar o colaborador.');
    } finally {
      enviando.current = false;
      setPendente(false);
    }
  }

  return <dialog ref={dialogo} aria-labelledby={titulo} onClose={fechar}
    onCancel={event => { if (enviando.current) event.preventDefault(); }}
    className="modal-panel m-auto w-[min(94vw,480px)] rounded-xl border border-line bg-surface p-4 text-foreground shadow-xl backdrop:bg-black/60 sm:p-6">
    <h2 id={titulo} className="mb-4 text-lg font-semibold">{dadosEdicao ? 'Editar colaborador' : 'Novo colaborador'}</h2>
    <form onSubmit={salvar}>
      <fieldset disabled={pendente} className="space-y-3">
        <label className="block text-sm font-medium">Nome
          <input autoFocus required name="nome" autoComplete="name" defaultValue={dadosEdicao?.nome} className={campo} />
        </label>
        <label className="block text-sm font-medium">Cargo
          <input required name="cargo" defaultValue={dadosEdicao?.cargo} className={campo} />
        </label>
        <label className="block text-sm font-medium">CPF
          <PatternFormat required inputMode="numeric" format="###.###.###-##" mask="_" value={cpf}
            onValueChange={valores => setCpf(valores.value)} className={campo} />
        </label>
        {ativo ? <div className="space-y-3 border-t border-line pt-3">
          <div>
            <h3 className="text-sm font-semibold">Acesso ao sistema</h3>
            <p className="mt-1 text-xs text-muted">{temLogin ? 'Preencha a senha apenas se quiser trocá-la.' : 'Preencha o e-mail e a senha para liberar o acesso.'}</p>
          </div>
          <label className="block text-sm font-medium">E-mail
            <input type="email" name="email" autoComplete="off" required={temLogin} defaultValue={dadosEdicao?.user?.email} className={campo} />
          </label>
          <label className="block text-sm font-medium">{temLogin ? 'Nova senha' : 'Senha'}
            <input type="password" name="senha" autoComplete="new-password" maxLength={72} className={campo} />
          </label>
          <label className="block text-sm font-medium">Nível de acesso
            <select name="role" defaultValue={dadosEdicao?.user?.role ?? 'USER'} className={campo}>
              <option value="USER">Vendedor</option>
              <option value="ADMIN">Administrador</option>
              <option value="OUTRO">Ponto e relatórios</option>
            </select>
          </label>
        </div> : <p className="text-sm text-muted">Colaborador inativo, sem acesso ao sistema.</p>}
        {erro && <p role="alert" className="text-sm text-danger-ink">{erro}</p>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" onClick={() => dialogo.current?.close()} className="min-h-11 rounded-lg px-4 text-sm hover:bg-surface-muted">Cancelar</button>
          <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
            {pendente ? 'Salvando…' : 'Salvar colaborador'}
          </button>
        </div>
      </fieldset>
    </form>
  </dialog>;
}
