"use client";

import { Pencil, Trash2, Plus, Copy, Check, Trash, FileDown, ShoppingCart } from 'lucide-react';
import { ItemOrcamento } from './utils/constants';
import { formatarMoeda } from './utils/formatarMoeda';
import { useState } from 'react';
import { nomeItem } from './utils/nomeItem';

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
  calculoPendente: boolean;
  erroCalculo: boolean;
  handleRemoverItem: (id: string) => void;
  valorTotalOrcamento: number;
  handleCopiarOrcamento: () => void;
  copiado: boolean;
  abrirModal: (id: string) => void;
  itemEditandoId: string | null;
  cancelarEdicao: () => void;
  abrirPersonalizado: () => void;
  abrirPdf: () => void;
  abrirVenda: () => void;
  renomear: (id: string, nome: string) => void;
}

export default function ResumoOrcamento({
  itens, quantidade, setQuantidade, calculoAtual,
  handleAdicionarItem, handleRemoverItem, calculoPendente, erroCalculo,
  valorTotalOrcamento, handleCopiarOrcamento, copiado, abrirModal,
  itemEditandoId, cancelarEdicao, abrirPersonalizado, abrirPdf, abrirVenda, renomear
}: ResumoOrcamentoProps) {
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  return (
    <div className="min-w-0 lg:col-span-3 space-y-5">
      {/* Quantidade e Botão Adicionar */}
      <section className="bg-surface rounded-xl shadow-sm p-4 sm:p-5 space-y-4 border border-line">
        <div className="flex items-center justify-between">
          <label className="font-medium text-secondary">Quantidade deste item</label>
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
            className="w-20 p-2 border border-line-strong rounded-lg text-center font-bold text-primary-ink focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
          />
        </div>

        <div className="bg-surface-soft border-l-2 border-amber-400 p-3 rounded-r-lg text-sm text-secondary space-y-1">
          {quantidade === 1 ? (
            <p><span className="font-semibold text-primary-ink">Subtotal do item:</span> R$ {formatarMoeda(calculoAtual.valorTotalItem)}</p>
          ) : (
            <p>
              <span className="font-semibold text-primary-ink">Subtotal do item:</span> R$ {formatarMoeda(calculoAtual.valorTotalItem)}{" "}
              <span className="text-[11px] text-muted font-normal">
                (unitário: R$ {formatarMoeda(calculoAtual.valorMaterial)})
              </span>
            </p>
          )}
          <p className="text-[11px] text-muted">
            Área desenvolvida: {calculoAtual.areaChapa.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} m² · Corte: {
              calculoAtual.minutosCorte > 0
                ? `${calculoAtual.minutosCorte} min e ${calculoAtual.segundosCorte} seg`
                : `${calculoAtual.segundosCorte} seg`
            }
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdicionarItem}
          disabled={calculoPendente || erroCalculo}
          className="w-full py-3 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {itemEditandoId ? <Check size={18} /> : <Plus size={18} />}
          {itemEditandoId ? 'Salvar alterações do item' : 'Adicionar ao orçamento'}
        </button>
        {(calculoPendente || erroCalculo) && <p role="status" className="text-sm text-muted">{erroCalculo ? 'Não foi possível atualizar o cálculo. Verifique sua conexão e aguarde uma nova tentativa.' : 'Atualizando cálculo para as medidas informadas...'}</p>}
        {itemEditandoId && (
          <button type="button" onClick={cancelarEdicao} className="w-full text-sm text-secondary hover:underline">
            Cancelar edição
          </button>
        )}
      </section>

      {/* Listagem Consolidada */}
      <section className="bg-surface rounded-xl shadow-sm p-4 sm:p-6 border border-line space-y-4 min-h-112.5 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line mb-4">
            <h2 className="text-xl font-bold text-primary-ink">Resumo do orçamento</h2>
            <button type="button" onClick={abrirPersonalizado} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-warning-ink hover:bg-warning-soft"><Plus size={17} />Item personalizado</button>
          </div>

          {itens.length === 0 ? (
            <div className="text-center py-12 text-subtle">
              <p className="text-base font-medium">Nenhum item adicionado ainda</p>
              <p className="text-sm">Configure o corte ou caixa ao lado e adicione à lista.</p>
            </div>
          ) : (
            <div className="divide-y divide-line max-h-100 overflow-y-auto pr-2">
              {itens.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 group">
                  <div className="min-w-0 space-y-0.5 break-words">
                    {renomeando === item.id ? (
                      <form className="space-y-2" onSubmit={event => {
                        event.preventDefault();
                        if (!nome.trim()) return;
                        renomear(item.id, nome);
                        setRenomeando(null);
                      }}>
                        <label className="block text-sm text-secondary">Nome do item
                          <input autoFocus required maxLength={1000} value={nome} onChange={event => setNome(event.target.value)} onKeyDown={event => {
                            if (event.key === 'Escape') setRenomeando(null);
                          }} className="mt-1 w-full min-w-0 rounded-lg border border-line-strong p-2 outline-none focus:border-amber-400" />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button type="submit" disabled={!nome.trim()} className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar nome</button>
                          <button type="button" onClick={() => setRenomeando(null)} className="min-h-11 rounded-lg bg-surface-muted px-3 py-2 text-sm text-secondary">Cancelar</button>
                        </div>
                      </form>
                    ) : <>
                      <p className="font-medium text-foreground">{item.descricaoTexto.split('\n')[0]}</p>
                      <button type="button" onClick={() => { setNome(nomeItem(item)); setRenomeando(item.id); }} className="min-h-11 text-sm font-medium text-muted underline underline-offset-2 hover:text-foreground">Renomear item</button>
                    </>}
                  </div>
                  <div className="flex w-full sm:w-auto flex-wrap items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      <span className="font-bold text-lg text-success-ink">R$ {formatarMoeda(item.valorTotalItem)}</span>
                      {item.quantidade > 1 && (
                        <p className="text-[11px] text-subtle font-normal">
                          {item.quantidade}x R$ {formatarMoeda(item.valorMaterial)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirModal(item.id)}
                        aria-label="Editar item"
                        className="mobile-touch-target bg-warning-soft text-warning-ink p-2.5 rounded-full hover:bg-warning-soft transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoverItem(item.id)}
                        aria-label="Remover item"
                        className="mobile-touch-target bg-danger-soft text-danger-ink p-2.5 rounded-full hover:bg-danger-soft transition-colors"
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

        <div className="pt-5 border-t border-line space-y-4">
          <div className="flex flex-wrap justify-between items-baseline gap-2">
            <span className="text-base font-medium text-muted">Valor final somado</span>
            <span className="text-3xl sm:text-4xl break-all font-black text-success-ink">R$ {formatarMoeda(valorTotalOrcamento)}</span>
          </div>

          <button
            onClick={handleCopiarOrcamento}
            disabled={itens.length === 0}
            className={`w-full py-3.5 text-base font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              itens.length === 0
                ? 'bg-surface-muted text-subtle cursor-not-allowed'
                : copiado
                  ? 'bg-warning-soft text-warning-ink'
                  : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {copiado ? <Check size={20} /> : <Copy size={18} />}
            {copiado ? 'Copiado com sucesso' : 'Copiar orçamento consolidado'}
          </button>
          <button type="button" onClick={abrirPdf} disabled={itens.length === 0} className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl border border-primary-ink px-4 py-3 font-bold text-primary-ink hover:bg-surface-soft disabled:cursor-not-allowed disabled:border-line disabled:text-subtle">
            <FileDown size={18} />Salvar orçamento em PDF
          </button>
          <button type="button" onClick={abrirVenda} className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-success-soft px-4 py-3 font-bold text-success-ink hover:bg-surface-hover">
            <ShoppingCart size={18} />{itens.length ? 'Gerar venda' : 'Consultar envios de venda'}
          </button>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger-ink border border-danger-line rounded-full hover:bg-danger-soft transition-colors"
        >
          <Trash size={15} />
          Limpar tudo
        </button>
      </div>
    </div>
  );
}
