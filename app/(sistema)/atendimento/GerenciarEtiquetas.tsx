'use client';

import { useCallback, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Formulario from './Formulario';

const campo = 'mt-1 block w-full rounded-lg border border-line-strong bg-surface p-2.5 text-sm text-foreground';

export default function GerenciarEtiquetas({ etiquetas }: { etiquetas: { id: string; nome: string }[] }) {
  const [selecionada, setSelecionada] = useState<{ id: string; modo: 'editar' | 'excluir' } | null>(null);
  const [aviso, setAviso] = useState('');

  const concluir = useCallback(({ mensagem }: { mensagem: string }) => {
    setSelecionada(null);
    setAviso(mensagem);
    window.dispatchEvent(new Event('atendimento:atualizar'));
  }, []);

  function selecionar(id: string, modo: 'editar' | 'excluir') {
    setAviso('');
    setSelecionada({ id, modo });
  }

  return <div className="space-y-5">
    <Formulario acao="criarEtiqueta" botao="Criar etiqueta" aoSalvar={concluir}>
      <label className="block text-sm font-medium">Nome da nova etiqueta
        <input name="nome" required maxLength={40} className={campo} autoComplete="off" />
      </label>
    </Formulario>
    {aviso && <p role="status" className="text-sm text-success-ink">{aviso}</p>}
    <div className="border-t border-line pt-4">
      <h3 className="mb-2 text-sm font-semibold">Etiquetas cadastradas</h3>
      {etiquetas.length ? <ul className="divide-y divide-line rounded-lg border border-line">
        {etiquetas.map(etiqueta => <li key={etiqueta.id} className="px-3 py-1">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 break-words text-sm [overflow-wrap:anywhere]">{etiqueta.nome}</span>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => selecionar(etiqueta.id, 'editar')}
                aria-label={`Editar etiqueta ${etiqueta.nome}`} title="Editar etiqueta" className="rounded-lg p-2.5 text-primary-ink hover:bg-surface-muted">
                <Pencil size={17} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => selecionar(etiqueta.id, 'excluir')}
                aria-label={`Excluir etiqueta ${etiqueta.nome}`} title="Excluir etiqueta" className="rounded-lg p-2.5 text-danger-ink hover:bg-danger-soft">
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
          {selecionada?.id === etiqueta.id && <div className="space-y-2 pb-3 pt-1">
            {selecionada.modo === 'editar' ? <Formulario acao="renomearEtiqueta" botao="Salvar nome" aoSalvar={concluir}>
              <input type="hidden" name="etiquetaId" value={etiqueta.id} />
              <label className="block text-sm font-medium">Novo nome
                <input name="nome" defaultValue={etiqueta.nome} required maxLength={40} className={campo} autoFocus />
              </label>
            </Formulario> : <Formulario acao="excluirEtiqueta" botao="Confirmar exclusão" aoSalvar={concluir}>
              <input type="hidden" name="etiquetaId" value={etiqueta.id} />
              <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger-ink">
                Excluir <strong>{etiqueta.nome}</strong>? A etiqueta será removida de todos os clientes que a usam.
              </p>
            </Formulario>}
            <button type="button" onClick={() => setSelecionada(null)}
              className="rounded-lg px-2 py-1.5 text-sm text-secondary hover:bg-surface-muted">Cancelar</button>
          </div>}
        </li>)}
      </ul> : <p className="text-sm text-muted">Nenhuma etiqueta cadastrada.</p>}
    </div>
  </div>;
}
