'use client';

import { PatternFormat, NumericFormat } from 'react-number-format';
import { criarMaterial, getCategorias, atualizarMaterial } from './actions';
import React, { useState, useEffect } from 'react';
import { Material } from './page';


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  materialInicial?: Material | null;
  duplicando?: boolean; // <- novo
  onSalvar?: (material: Material & { categoria: { id: string; nome: string } }) => void;
}

const DADOS_VAZIOS = {
  nome: '',
  espessura: '3',
  cor: 'Cristal',
  descricao: '',
  custo: 0,
  valorVendaInteiro: null as number | null,
  ValorVendaFracionado: null as number | null,
  estoque: 1,
  categoria: '',
  largura: 100 as number | null,
  altura: 200 as number | null,
  velocidadeCorte: 0 as number | null,
};



export default function ModalMaterial({ isOpen, onClose, title, materialInicial, duplicando, onSalvar }: ModalProps) {
  const [dados, setDados] = useState(DADOS_VAZIOS);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);

  // Só é edição se NÃO estiver duplicando
  const editando = !!materialInicial && !duplicando;

  useEffect(() => {
    if (isOpen) {
      getCategorias().then(setCategorias);

      if (materialInicial) {
        setDados({
          nome: materialInicial.nome ?? '',
          espessura: materialInicial.espessura ?? '',
          cor: materialInicial.cor ?? '',
          descricao: materialInicial.descricao ?? '',
          custo: materialInicial.custo,
          // Ao duplicar, os preços voltam a ser sugeridos a partir do novo custo
          valorVendaInteiro:  (materialInicial.valorVendaInteiro ?? null) ,
          ValorVendaFracionado: (materialInicial.ValorVendaFracionado ?? null) ,
          estoque: duplicando ? 1 : materialInicial.estoque,
          largura: materialInicial.largura,
          altura: materialInicial.altura,
          velocidadeCorte: materialInicial.velocidadeCorte,
          categoria: materialInicial.categoriaId,
        });
      } else {
        setDados(DADOS_VAZIOS)
      }
    }
  }, [isOpen, materialInicial, duplicando]);


  async function handleMaterial() {
    const payload = {
      ...dados,
      valorVendaInteiro: dados.valorVendaInteiro ?? vendaSugerida,
      ValorVendaFracionado: dados.ValorVendaFracionado ?? m2Sugerido,
    };

    if (editando && materialInicial) {
      const materialAtualizado = await atualizarMaterial(materialInicial.id, payload);
      onSalvar?.(materialAtualizado);
    } else {
      const materialCriado = await criarMaterial(payload);
      onSalvar?.(materialCriado);
    }
    setDados(DADOS_VAZIOS);
    onClose();
  }

  const custo = dados.custo ?? 0;
  const area = (dados.largura ?? 0) * (dados.altura ?? 0);

  const vendaSugerida = Number((custo * 1.28).toFixed(2));
  const m2Sugerido = area > 0 ? Number(((custo / area) * 10000 * 1.95).toFixed(2)) : 0;

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
              className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none">
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
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>
            </div>

            <div className='flex gap-5'>
              <label className='w-full'>
                Espessura
                <NumericFormat
                  decimalSeparator=","
                  suffix=" mm"
                  decimalScale={2}
                  allowNegative={false}
                  value={dados.espessura}
                  onValueChange={(e) => setDados({ ...dados, espessura: e.value })}
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="2 mm"
                />
              </label>

              <label className='w-full'>
                Cor
                <input
                  type="text"
                  placeholder="Cristal"
                  value={dados.cor}
                  onChange={(e) => setDados({ ...dados, cor: e.target.value })}
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>
            </div>

            <div className="flex gap-5">
              <label className='w-full'>
                Largura
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  suffix="  cm"
                  decimalScale={1}
                  allowNegative={false}
                  value={dados.largura}
                  onValueChange={(v) => setDados({ ...dados, largura: v.floatValue ?? null })}
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="1000 cm"
                />
              </label>

              <label className='w-full'>
                Altura
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  suffix=" cm"
                  decimalScale={1}
                  allowNegative={false}
                  value={dados.altura}
                  onValueChange={(v) => setDados({ ...dados, altura: v.floatValue ?? null })}
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="2000 cm"
                />
              </label>
            </div>

            <div className='flex gap-5'>
              <label className='w-full'>
                Velocidade de corte
                <NumericFormat
                  decimalSeparator=","
                  suffix=" mm/s"
                  decimalScale={2}
                  allowNegative={false}
                  value={dados.velocidadeCorte}
                  onValueChange={(v) => setDados({ ...dados, velocidadeCorte: v.floatValue ?? null })}
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="0 mm/s"
                />
              </label>

              <label className='w-full'>
                Estoque*
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  suffix=" UND"
                  decimalScale={1}
                  allowNegative={false}
                  value={dados.estoque}
                  onValueChange={(e) => setDados({ ...dados, estoque: e.floatValue ?? 0 })}
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="1 und"
                />
              </label>
            </div>


            <div className='flex gap-5'>

              <label className='w-47'>
                Preço de custo*
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
            </div>

            <div className='flex gap-5'>
              <label className='w-full'>
                Preço de venda
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  fixedDecimalScale
                  decimalScale={2}
                  value={dados.valorVendaInteiro ?? vendaSugerida}
                  onValueChange={(v, info) => {
                    if (info.source !== "event") return;
                    setDados({ ...dados, valorVendaInteiro: v.floatValue ?? null });
                  }}
                  className="w-full border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="R$ 00,00"
                />
              </label>

              <label className='w-full'>
                Preço de venda M²
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  fixedDecimalScale
                  decimalScale={2}
                  value={dados.ValorVendaFracionado ?? m2Sugerido}
                  onValueChange={(v, info) => {
                    if (info.source !== "event") return;
                    setDados({ ...dados, ValorVendaFracionado: v.floatValue ?? null });
                  }}
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