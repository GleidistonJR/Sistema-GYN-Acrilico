"use client";

import { Pencil, Trash2, Plus, Copy, Check, Trash } from 'lucide-react';
import { ItemOrcamento } from './utils/constants';
import { formatarMoeda } from './utils/formatarMoeda';

interface ResumoOrcamentoProps {
  itens: ItemOrcamento[];
  quantidade: number;
  setQuantidade: (qtd: number) => void;
  calculoAtual: {
    valorTotalItem: number;
    valorMaterial: number;
    areaChapa: number;
    minutosCorte: number;
    segundosCorte: number;
  };
  handleAdicionarItem: () => void;
  handleRemoverItem: (id: string) => void;
  valorTotalOrcamento: number;
  handleCopiarOrcamento: () => void;
  copiado: boolean;
  abrirModal: (id: string) => void;
}

export default function ResumoOrcamento({
  itens, quantidade, setQuantidade, calculoAtual,
  handleAdicionarItem, handleRemoverItem,
  valorTotalOrcamento, handleCopiarOrcamento, copiado, abrirModal
}: ResumoOrcamentoProps) {
  return (
    <div className="lg:col-span-3 space-y-5">
      {/* Quantidade e Botão Adicionar */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-slate-200">
        <div className="flex items-center justify-between">
          <label className="font-medium text-slate-700">Quantidade deste item</label>
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
            className="w-20 p-2 border border-slate-300 rounded-lg text-center font-bold text-[#0A2540] focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
          />
        </div>

        <div className="bg-slate-50 border-l-2 border-amber-400 p-3 rounded-r-lg text-sm text-slate-700 space-y-1">
          {quantidade === 1 ? (
            <p><span className="font-semibold text-[#0A2540]">Subtotal do item:</span> R$ {formatarMoeda(calculoAtual.valorTotalItem)}</p>
          ) : (
            <p>
              <span className="font-semibold text-[#0A2540]">Subtotal do item:</span> R$ {formatarMoeda(calculoAtual.valorTotalItem)}{" "}
              <span className="text-[11px] text-slate-500 font-normal">
                (unitário: R$ {formatarMoeda(calculoAtual.valorMaterial)})
              </span>
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            Área desenvolvida: {calculoAtual.areaChapa} m² · Corte: {
              calculoAtual.minutosCorte > 0
                ? `${calculoAtual.minutosCorte} min e ${calculoAtual.segundosCorte} seg`
                : `${calculoAtual.segundosCorte} seg`
            }
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdicionarItem}
          className="w-full py-3 flex items-center justify-center gap-2 bg-[#0A2540] hover:bg-[#0f3a6b] text-white font-semibold rounded-lg transition-colors"
        >
          <Plus size={18} />
          Adicionar ao orçamento
        </button>
      </section>

      {/* Listagem Consolidada */}
      <section className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-4 min-h-112.5 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A2540] pb-3 border-b border-slate-100 mb-4">Resumo do orçamento</h2>

          {itens.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-base font-medium">Nenhum item adicionado ainda</p>
              <p className="text-sm">Configure o corte ou caixa ao lado e adicione à lista.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-100 overflow-y-auto pr-2">
              {itens.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center group">
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-800">{(item.descricaoTexto || '').split('\n')[0]}</p>                    
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-bold text-lg text-emerald-600">R$ {formatarMoeda(item.valorTotalItem)}</span>
                      {item.quantidade > 1 && (
                        <p className="text-[11px] text-slate-400 font-normal">
                          {item.quantidade}x R$ {formatarMoeda(item.valorMaterial)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirModal(item.id)}
                        aria-label="Editar item"
                        className="bg-amber-50 text-amber-700 p-2.5 rounded-full hover:bg-amber-100 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoverItem(item.id)}
                        aria-label="Remover item"
                        className="bg-red-50 text-red-600 p-2.5 rounded-full hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-5 border-t border-slate-100 space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-base font-medium text-slate-500">Valor final somado</span>
            <span className="text-4xl font-black text-emerald-600">R$ {formatarMoeda(valorTotalOrcamento)}</span>
          </div>

          <button
            onClick={handleCopiarOrcamento}
            disabled={itens.length === 0}
            className={`w-full py-3.5 text-base font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              itens.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : copiado
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#0A2540] text-white hover:bg-[#0f3a6b]'
            }`}
          >
            {copiado ? <Check size={20} /> : <Copy size={18} />}
            {copiado ? 'Copiado com sucesso' : 'Copiar orçamento consolidado'}
          </button>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
        >
          <Trash size={15} />
          Limpar tudo
        </button>
      </div>
    </div>
  );
}