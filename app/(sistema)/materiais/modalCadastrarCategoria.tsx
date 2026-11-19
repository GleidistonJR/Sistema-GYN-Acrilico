'use client';

import { useState } from 'react';
import { criarCategoria, atualizarCategoria } from './actions';

export interface Categoria {
  id: string;
  nome: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  categoria?: Categoria;
  onSalvar?: (categoria: Categoria) => void;
}

export default function ModalCategoria({ isOpen, onClose, title, categoria, onSalvar }: ModalProps) {
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSalvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando || !nome.trim()) return;
    setSalvando(true);
    setErro('');
    try {
      const resultado = categoria
        ? await atualizarCategoria(categoria.id, nome)
        : await criarCategoria(nome);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      onSalvar?.(resultado.categoria);
      onClose();
    } catch {
      setErro('Não foi possível salvar a categoria. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/25">
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-categoria" className="modal-panel bg-surface rounded-xl shadow-2xl border border-line max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-line bg-surface-soft">
          <h3 id="titulo-categoria" className="text-lg font-bold text-secondary">{title}</h3>
          <button type="button" onClick={onClose} disabled={salvando} aria-label="Fechar categoria" className="mobile-touch-target p-2 rounded-lg text-muted hover:bg-surface-hover disabled:opacity-50">✕</button>
        </div>
        <form onSubmit={handleSalvar} className="p-4 sm:p-6 space-y-4">
          <label className="block text-sm font-medium text-secondary">
            Nome da categoria
            <input autoFocus required maxLength={120} value={nome} onChange={event => setNome(event.target.value)} disabled={salvando} placeholder="Ex.: MDF" className="mt-2 w-full p-2.5 border rounded-lg bg-surface-soft outline-none focus:border-blue-500" />
          </label>
          {categoria && <p className="text-sm text-muted">O novo nome será exibido em todos os materiais desta categoria.</p>}
          {categoria && ['Acrílico', 'Personalização'].includes(categoria.nome) && nome.trim() !== categoria.nome && (
            <p className="text-sm text-warning-ink bg-warning-soft border border-warning-line rounded-lg p-3">Esta categoria é identificada pelo nome nas regras de orçamento. Renomeá-la pode exigir ajustes nesses cálculos.</p>
          )}
          {erro && <p role="alert" className="text-sm text-danger-ink bg-danger-soft rounded-lg p-3">{erro}</p>}
          <div className="flex flex-wrap gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} disabled={salvando} className="min-h-11 px-4 py-2 bg-surface-hover text-secondary font-semibold rounded-lg disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={salvando || !nome.trim()} className="min-h-11 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">{salvando ? 'Salvando...' : categoria ? 'Salvar alterações' : 'Salvar categoria'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
