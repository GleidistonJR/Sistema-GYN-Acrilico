"use client";

import { Pencil, Trash2 } from 'lucide-react';
import { ItemOrcamento } from './constants';

interface ResumoOrcamentoProps {
  itens: ItemOrcamento[];
  quantidade: number;
  setQuantidade: (qtd: number) => void;
  calculoAtual: {
    valorTotalItem: number;
    valorMaterial: number; // Adicionado para pegarmos o valor unitário atual
    areaChapa: number;
    minutosCorte: number;
    segundosCorte: number;
  };
  handleAdicionarItem: () => void;
  handleRemoverItem: (id: string) => void;
  valorTotalOrcamento: number;
  handleCopiarOrcamento: () => void;
  copiado: boolean;
}

export default function ResumoOrcamento({
  itens, quantidade, setQuantidade, calculoAtual,
  handleAdicionarItem, handleRemoverItem,
  valorTotalOrcamento, handleCopiarOrcamento, copiado
}: ResumoOrcamentoProps) {
  return (
    <div className="lg:col-span-3 space-y-6">
      {/* Quantidade e Botão Adicionar */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <label className="font-medium text-gray-700">Quantidade deste Item:</label>
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
            className="w-20 p-2 border border-gray-300 rounded-lg text-center font-bold"
          />
        </div>

        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 space-y-1">
          {quantidade === 1 ? (
            <p><strong>Subtotal do Item:</strong> R$ {calculoAtual.valorTotalItem.toFixed(2)}</p>
          ) : (
            <p>
              <strong>Subtotal do Item:</strong> R$ {calculoAtual.valorTotalItem.toFixed(2)}{" "}
              <span className="text-xs text-blue-600 font-normal">
                (Unitário: R$ {calculoAtual.valorMaterial.toFixed(2)})
              </span>
            </p>
          )}
          <p className="text-xs text-blue-600">
            Área Desenvolvida: {calculoAtual.areaChapa.toFixed(4)} m² | Corte: {
              calculoAtual.minutosCorte > 0 
                ? `${calculoAtual.minutosCorte} min e ${calculoAtual.segundosCorte} seg`
                : `${calculoAtual.segundosCorte} seg`
            }
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdicionarItem}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition hover:cursor-pointer"
        >
          + Adicionar ao Orçamento
        </button>
      </section>

      {/* Listagem Consolidada */}
      <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-4 min-h-112.5 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-700 pb-3 border-b border-gray-100 mb-4">Resumo do Orçamento Multi-Material</h2>

          {itens.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">Nenhum item adicionado ainda.</p>
              <p className="text-sm">Configure a chapa ou caixa ao lado e adicione à lista.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-300 max-h-100 overflow-y-auto pr-2">
              {itens.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center group">
                  <div className="space-y-0.5">
                    <p className="font-medium text-gray-900">{item.descricaoTexto.split('\n')[0]}</p>
                    <p className="text-xs text-gray-500">
                      Área total: {item.areaChapa.toFixed(4)}m² {item.tipoPers !== 'nenhum' && `| Área Pers: ${item.areaPers.toFixed(4)}m²`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="text-center">
                      <span className="font-bold text-lg text-green-700">R$ {item.valorTotalItem.toFixed(2)}</span>
                      {item.quantidade > 1 && (
                        <p className="text-xxs text-gray-400 font-normal">
                          {item.quantidade}x R$ {item.valorMaterial.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className='flex gap-4'>
                      <button
                        onClick={() => handleRemoverItem(item.id)}
                        className="bg-amber-100 text-amber-700 p-3 m-0 rounded-full hover:bg-amber-200 hover:cursor-pointer"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleRemoverItem(item.id)}
                        className="bg-red-100 text-red-700 p-3 m-0 rounded-full hover:bg-red-200 hover:cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-medium text-gray-500">Valor Final Somado:</span>
            <span className="text-5xl font-black text-green-600">R$ {valorTotalOrcamento.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCopiarOrcamento}
            disabled={itens.length === 0}
            className={`w-full py-4 text-xl font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
              itens.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : copiado
                  ? 'bg-emerald-600 text-white'
                  : 'bg-green-600 text-white hover:bg-green-500 hover:cursor-pointer'
            }`}
          >
            {copiado ? '✓ Copiado com Sucesso!' : 'Copiar Orçamento Consolidado'}
          </button>
        </div>
      </section>

      <div className='flex justify-end'>
        <button 
          className='bg-red-600 px-10 py-2 text-2xl text-white rounded-full hover:bg-red-700 hover:cursor-pointer transition-colors' 
          onClick={() => window.location.reload()}
        >
          Limpar Tudo
        </button>
      </div>
    </div>
  );
}