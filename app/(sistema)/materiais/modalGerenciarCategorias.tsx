'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { getCategorias } from './actions';
import ModalCategoria, { type Categoria } from './modalCadastrarCategoria';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';

interface Props {
  onClose: () => void;
  onSalvar: (categoria: Categoria) => void;
}

export default function ModalGerenciarCategorias({ onClose, onSalvar }: Props) {
  const { dados: categorias, setDados: setCategorias, carregando, erro } = useDadosAtualizados(getCategorias, []);
  const [editando, setEditando] = useState<Categoria | null>(null);

  if (editando) {
    return <ModalCategoria key={editando.id} isOpen title="Editar categoria" categoria={editando} onClose={() => setEditando(null)} onSalvar={categoria => {
      setCategorias(atuais => atuais.map(atual => atual.id === categoria.id ? categoria : atual)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      onSalvar(categoria);
    }} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-categorias" className="modal-panel w-full max-w-lg rounded-xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b bg-surface-soft p-4">
          <h2 id="titulo-categorias" className="text-lg font-bold text-secondary">Gerenciar categorias</h2>
          <button type="button" onClick={onClose} aria-label="Fechar gerenciamento de categorias" className="mobile-touch-target shrink-0 rounded-lg p-2 text-muted hover:bg-surface-hover"><X size={22} /></button>
        </div>
        <div className="p-4 sm:p-6">
          <p className="mb-4 text-sm text-muted">Escolha uma categoria para editar seu nome.</p>
          {carregando ? <p role="status" className="py-4 text-muted">Carregando categorias...</p>
            : erro && categorias.length === 0 ? <p role="alert" className="text-sm text-danger-ink">Não foi possível carregar as categorias. Tentaremos novamente automaticamente.</p>
            : categorias.length === 0 ? <p className="py-4 text-muted">Nenhuma categoria cadastrada.</p>
            : <ul className="divide-y divide-line">
              {categorias.map(categoria => (
                <li key={categoria.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 break-words font-medium text-secondary">{categoria.nome}</span>
                  <button type="button" onClick={() => setEditando(categoria)} aria-label={`Editar categoria ${categoria.nome}`} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-warning-ink hover:bg-warning-soft"><Pencil size={16} />Editar</button>
                </li>
              ))}
            </ul>}
        </div>
      </section>
    </div>
  );
}
