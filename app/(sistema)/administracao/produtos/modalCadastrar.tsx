'use client';

import { PatternFormat, NumericFormat } from 'react-number-format';
import { criarInsumo } from './actions';
import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function Modal({ isOpen, onClose, title }: ModalProps) {
  const [dados, setDados] = useState({
    nome: "",
    unidadeMedida: "",
    precoCusto: 0,
    larguraChapaCm: 0,
    alturaChapaCm: 0,
  });

  async function handleInsumo() {
    await criarInsumo(dados);
    onClose(); // Só fecha quando terminar de salvar
  }

  // Se não estiver aberto, não renderiza nada no HTML
  if (!isOpen) return null;

  return (
    // 1. Fundo escurecido (Overlay) - Cobre a tela toda
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25  animate-fade-in">

      {/* 2. Caixa do Modal */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden animate-scale-up">

        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-700">{title}</h3>

          {/* Botão de Fechar (X) */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Corpo do Modal (Onde entra o conteúdo dinâmico) */}
        <div className="p-6">
          {/* Tudo o que você colocar aqui dentro vira o 'children' do modal */}
          <div className="space-y-4">
            <div>
              <label>
                Nome*
                <input
                  type="text"
                  placeholder="Acrilico Crital 2mm"
                  onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>
            </div>

            <div>
              <label>
                Unidade de Medida*
                <input
                  type="text"
                  placeholder="UN / M / KG"
                  onChange={(e) => setDados({ ...dados, unidadeMedida: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>
            </div>

            <div className='flex gap-5'>
              <div>
                <label>
                  Largura Chapa
                  <input
                    type="text"
                    placeholder="100"
                    onChange={(e) => setDados({ ...dados, larguraChapaCm: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </label>
              </div>

              <div>
                <label>
                  Altura Chapa
                  <input
                    type="text"
                    placeholder="200"
                    onChange={(e) => setDados({ ...dados, alturaChapaCm: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </label>
              </div>
            </div>

            <div>
              <label>
                Preço de Custo*
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  fixedDecimalScale
                  decimalScale={2}
                  // O 'values' é um objeto que a biblioteca nos dá. 
                  // Usamos o 'values.value' para pegar apenas os números.
                  onValueChange={(e) => setDados({ ...dados, precoCusto: Number(e.value) })}
                  className="w-full border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="R$ 000,00"
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
                onClick={handleInsumo}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}