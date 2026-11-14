'use client';

import React, { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { criarProduto, atualizarProduto } from './actions';
import type { Produto } from './page';
import CampoFoto from '../components/CampoFoto';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  produtoInicial?: Produto | null;
  duplicando?: boolean; // <- novo
  onSalvar?: (produto: Produto) => void;
  administrador: boolean;
}

const DADOS_VAZIOS = {
  nome: '',
  descricao: '',
  estoque: 0,
  estoquePadrao: 0,
  precoCusto: 0,
  precoVenda: 0,
  foto: undefined as string | null | undefined,
};

export default function ModalProduto({ isOpen, onClose, title, produtoInicial, duplicando, onSalvar, administrador }: ModalProps) {
  const [dados, setDados] = useState(DADOS_VAZIOS);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [fotoProcessando, setFotoProcessando] = useState(false);

  // Só é edição se NÃO estiver duplicando
  const editando = !!produtoInicial && !duplicando;

  useEffect(() => {
    if (!isOpen) return;
    if (produtoInicial) {
      setDados({
        nome: produtoInicial.nome,
        descricao: produtoInicial.descricao ?? '',
        estoque: produtoInicial.estoque,
        estoquePadrao: duplicando ? 0 : produtoInicial.estoquePadrao ?? 0,
        precoCusto: produtoInicial.precoCusto,
        precoVenda: produtoInicial.precoVenda,
        foto: undefined,
      });
    } else {
      setDados(DADOS_VAZIOS);
    }
  }, [isOpen, produtoInicial, duplicando]);

  async function handleSalvar() {
    if (!dados.nome.trim() || salvando || fotoProcessando) return;

    setSalvando(true);
    setErro('');
    try {
      const payload = administrador ? dados : {
        ...(!editando ? { nome: dados.nome, foto: dados.foto } : {}),
        descricao: dados.descricao,
        estoque: dados.estoque,
      };
      const salvo = editando && produtoInicial
        ? await atualizarProduto(produtoInicial.id, payload)
        : await criarProduto(payload);
      onSalvar?.(salvo);
      setDados(DADOS_VAZIOS);
      onClose();
    } catch {
      setErro('Não foi possível salvar o produto. Confira seus dados e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/25">
      <div className="modal-panel bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full ">

        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-700">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {(administrador || !editando) && <CampoFoto fotoAtual={duplicando ? null : produtoInicial?.foto} valor={dados.foto} onChange={foto => setDados(atuais => ({ ...atuais, foto }))} onProcessando={setFotoProcessando} desabilitado={salvando} />}

          <label className="block">
            Nome*
            <input
              type="text"
              placeholder="Display de acrílico 2mm cristal"
              value={dados.nome}
              disabled={editando && !administrador}
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

          {administrador && <label className="block">
            Estoque padrão
            <NumericFormat
              thousandSeparator="."
              decimalSeparator=","
              suffix=" UND"
              decimalScale={0}
              allowNegative={false}
              value={dados.estoquePadrao}
              onValueChange={v => setDados({ ...dados, estoquePadrao: v.floatValue ?? 0 })}
              className="mt-1 w-full p-2 border rounded-lg bg-gray-50 outline-none focus:border-blue-500"
            />
            <span className="block mt-1 text-xs text-gray-500">Quantidade desejada em estoque. Deixe 0 para não incluir na lista de compras.</span>
          </label>}

          {administrador && <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
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
          </div>}

          {!administrador && <p className="text-sm text-gray-500">{editando ? 'Você pode alterar o estoque e a descrição deste produto.' : 'Preços e estoque padrão começam em zero e serão definidos pelo administrador.'}</p>}
          {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}

          <div className="flex flex-wrap gap-3 justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={!dados.nome.trim() || salvando || fotoProcessando}
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
