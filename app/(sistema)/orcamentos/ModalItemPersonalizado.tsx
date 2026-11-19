'use client';

import { useEffect, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { X } from 'lucide-react';
import type { ItemOrcamento } from './utils/constants';
import { formatarMoeda } from './utils/formatarMoeda';

interface Props {
  item: ItemOrcamento | null;
  onClose: () => void;
  onSalvar: (titulo: string, valor: number, quantidade: number) => void;
}

export default function ModalItemPersonalizado({ item, onClose, onSalvar }: Props) {
  const [titulo, setTitulo] = useState(item?.tituloPersonalizado ?? '');
  const [valor, setValor] = useState<number | undefined>(item?.valorMaterial);
  const [quantidade, setQuantidade] = useState<number | undefined>(item?.quantidade ?? 1);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [onClose]);

  function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      onSalvar(titulo, valor ?? 0, quantidade ?? 0);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Confira os dados do item.');
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-item-personalizado" className="modal-panel w-full max-w-md rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <h2 id="titulo-item-personalizado" className="font-bold text-lg text-primary-ink">{item ? 'Editar item personalizado' : 'Adicionar item personalizado'}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar item personalizado" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-muted"><X size={20} /></button>
        </div>
        <form onSubmit={salvar} className="space-y-4 p-4 sm:p-6">
          <label className="block text-sm font-medium text-secondary">
            Título do item
            <input autoFocus required value={titulo} onChange={event => setTitulo(event.target.value)} placeholder="Ex.: Mão de obra ou modelagem 3D" className="mt-2 w-full rounded-lg border border-line-strong bg-surface-soft p-2.5 outline-none focus:border-amber-400" />
          </label>
          <label className="block text-sm font-medium text-secondary">
            Valor unitário
            <NumericFormat value={valor} onValueChange={dados => setValor(dados.floatValue)} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale allowNegative={false} prefix="R$ " placeholder="R$ 0,00" inputMode="decimal" className="mt-2 w-full rounded-lg border border-line-strong bg-surface-soft p-2.5 outline-none focus:border-amber-400" />
          </label>
          <label className="block text-sm font-medium text-secondary">
            Quantidade
            <NumericFormat value={quantidade} onValueChange={dados => setQuantidade(dados.floatValue)} decimalScale={0} allowNegative={false} inputMode="numeric" className="mt-2 w-full rounded-lg border border-line-strong bg-surface-soft p-2.5 outline-none focus:border-amber-400" />
          </label>
          <p className="rounded-lg bg-warning-soft p-3 text-sm font-semibold text-warning-ink">Total do item: R$ {formatarMoeda(Math.round((valor ?? 0) * 100) * (quantidade ?? 0) / 100)}</p>
          <p className="text-sm text-muted">O valor unitário será multiplicado pela quantidade, sem taxas adicionais.</p>
          {erro && <p role="alert" className="text-sm text-danger-ink">{erro}</p>}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="min-h-11 rounded-lg bg-surface-muted px-4 py-2 font-semibold text-secondary">Cancelar</button>
            <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover">{item ? 'Salvar alterações' : 'Adicionar item'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
