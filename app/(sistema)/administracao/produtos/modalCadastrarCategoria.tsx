'use client';

import { PatternFormat, NumericFormat } from 'react-number-format';
import { criarCategoria } from './actions';
import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function ModalCategoria({ isOpen, onClose, title }: ModalProps) {
  const [nomeCategoria, setnomeCategoria] = useState(String);

  async function handleCategoria() {
    await criarCategoria(nomeCategoria);
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
                  onChange={(e) => setnomeCategoria(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                onClick={handleCategoria}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>

      </div >
    </div >
  );
}