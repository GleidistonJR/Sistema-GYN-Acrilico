'use client';

import React, { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { criarProduto, atualizarProduto } from './actions';
import type { Produto } from './page';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  produtoInicial?: Produto | null;
  duplicando?: boolean; // <- novo
  onSalvar?: (produto: Produto) => void;
}

const DADOS_VAZIOS = {
  nome: '',
  descricao: '',
  estoque: 0,
  precoCusto: 0,
  precoVenda: 0,
};

export default function ModalProduto({ isOpen, onClose, title, produtoInicial, duplicando, onSalvar }: ModalProps) {
  const [dados, setDados] = useState(DADOS_VAZIOS);
  const [salvando, setSalvando] = useState(false);

  // Só é edição se NÃO estiver duplicando
  const editando = !!produtoInicial && !duplicando;

  useEffect(() => {
    if (!isOpen) return;
    if (produtoInicial) {
      setDados({
        nome: produtoInicial.nome,
        descricao: produtoInicial.descricao ?? '',
        estoque: produtoInicial.estoque,
        precoCusto: produtoInicial.precoCusto,
        precoVenda: produtoInicial.precoVenda,
      });
    } else {
      setDados(DADOS_VAZIOS);
    }
  }, [isOpen, produtoInicial, duplicando]);

  async function handleSalvar() {
    if (!dados.nome.trim() || salvando) return;

    setSalvando(true);
    try {
      const salvo = editando && produtoInicial
        ? await atualizarProduto(produtoInicial.id, dados)
        : await criarProduto(dados);
      onSalvar?.(salvo);
      setDados(DADOS_VAZIOS);
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden">

        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-700">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">

          <label className="block">
            Nome*
            <input
              type="text"
              placeholder="Display de acrílico 2mm cristal"
              value={dados.nome}
              onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </label>

          <label className="block">
            Descrição
            <textarea
              rows={3}
              value={dados.descricao}
              onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
              className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </label>

          <label className="block">
            Estoque*
            <NumericFormat
              thousandSeparator="."
              decimalSeparator=","
              suffix=" UND"
              decimalScale={0}
              allowNegative={false}
              value={dados.estoque}
              onValueChange={(v) => setDados({ ...dados, estoque: v.floatValue ?? 0 })}
              className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0 UND"
            />
          </label>

          <div className="flex gap-5">
            <label className="w-full">
              Preço de custo*
              <NumericFormat
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                fixedDecimalScale
                decimalScale={2}
                value={dados.precoCusto}
                onValueChange={(v) => setDados({ ...dados, precoCusto: v.floatValue ?? 0 })}
                className="w-full border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="R$ 00,00"
              />
            </label>

            <label className="w-full">
              Preço de venda*
              <NumericFormat
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                fixedDecimalScale
                decimalScale={2}
                value={dados.precoVenda}
                onValueChange={(v) => setDados({ ...dados, precoVenda: v.floatValue ?? 0 })}
                className="w-full border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="R$ 00,00"
              />
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={!dados.nome.trim() || salvando}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}