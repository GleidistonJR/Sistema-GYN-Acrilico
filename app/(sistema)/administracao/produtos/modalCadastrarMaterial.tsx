'use client';

import { PatternFormat, NumericFormat } from 'react-number-format';
import { criarMaterial, getCategorias, atualizarMaterial } from './actions';
import React, { useState, useEffect } from 'react';

interface Material {
  id: string;
  nome: string | null;
  espessura: string | null;
  cor: string | null;
  descricao: string | null;
  custo: number;
  estoque: number;
  categoriaId: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  materialInicial?: Material | null;
  onSalvar?: (material: Material & {categoria: {id: string; nome: string}}) => void;
}

const DADOS_VAZIOS = {
  nome: '',
  espessura: '',
  cor: '',
  descricao: '',
  custo: 0,
  estoque: 0,
  categoria: '',
};



export default function ModalMaterial({ isOpen, onClose, title, materialInicial, onSalvar }: ModalProps) {
  const [dados, setDados] = useState(DADOS_VAZIOS);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);

  const editando = !!materialInicial;

  useEffect(() => {
    if (isOpen) {
      getCategorias().then(setCategorias);

      if(materialInicial){
        setDados({
          nome: materialInicial.nome ?? '',
          espessura: materialInicial.espessura ?? '',
          cor: materialInicial.cor ?? '',
          descricao: materialInicial.descricao ?? '',
          custo: materialInicial.custo,
          estoque: materialInicial.estoque,
          categoria: materialInicial.categoriaId,
        });
      } else{
        setDados(DADOS_VAZIOS)
      }
    }
  }, [isOpen, materialInicial]);


async function handleMaterial() {
    if (editando && materialInicial) {
      const materialAtualizado = await atualizarMaterial(materialInicial.id, dados);
      onSalvar?.(materialAtualizado);
    } else {
      const materialCriado = await criarMaterial(dados);
      onSalvar?.(materialCriado);
    }
    onClose();
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

            <label htmlFor="categoria">
              Categoria*
            </label>
            <select id="categoria" name='categoria'
              value={dados.categoria}
              onChange={(e) => setDados({ ...dados, categoria: e.target.value })}
              className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">Selecione...</option>

              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}

            </select>




            <div>
              <label>
                Nome
                <input
                  type="text"
                  placeholder="Acrilico Crital 2mm"
                  value={dados.nome}
                  onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>
            </div>

            <div className='flex gap-5'>
              <div>
                <label>
                  Espessura
                  <input name='espessura'
                    value={dados.espessura}
                    type='number'
                    onChange={(e) => setDados({ ...dados, espessura: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />                    
                </label>
              </div>


              <div>
                <label>
                  Cor
                  <input
                    type="text"
                    placeholder="Cristal"
                    value={dados.cor}
                    onChange={(e) => setDados({ ...dados, cor: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </label>
              </div>
            </div>


            <div className='flex gap-5'>
              <label>
                Preço de Custo*
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  fixedDecimalScale
                  decimalScale={2}
                  value={dados.custo}
                  onValueChange={(e) => setDados({ ...dados, custo: Number(e.value) })}
                  className="w-full border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="R$ 000,00"
                />
              </label>

              <label>
                Estoque*
                <input type="number" name="estoque" id="estoque"
                  onChange={(e) => setDados({ ...dados, estoque: Number(e.target.value) })}
                  value={dados.estoque}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none" />
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
                onClick={handleMaterial}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                {editando ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>

      </div >
    </div >
  );
}