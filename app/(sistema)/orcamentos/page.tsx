'use client';

import React, { useState, useMemo } from 'react';
import { MATERIAIS_CONFIG, PERSONALIZACAO_CONFIG, ItemOrcamento } from './constants';

export default function CalculadorChapa() {
  // Ajuste global de markup
  const [porcentagem, setPorcentagem] = useState<number>(65);

  // Estados do Formulário Atual
  const [tipoMaterial, setTipoMaterial] = useState<string>('acrilico');
  const [corChapa, setCorChapa] = useState<string>('cristal');
  const [espessuraChapa, setEspessuraChapa] = useState<string>('2');
  const [larguraChapa, setLarguraChapa] = useState<string>('0');
  const [alturaChapa, setAlturaChapa] = useState<string>('0');

  const [tipoPers, setTipoPers] = useState<string>('nenhum');
  const [larguraPers, setLarguraPers] = useState<string>('0');
  const [alturaPers, setAlturaPers] = useState<string>('0');
  const [quantidade, setQuantidade] = useState<number>(1);

  // Lista de materiais adicionados ao orçamento atual
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [copiado, setCopiado] = useState<boolean>(false);

  // Função interna para calcular os valores em tempo real ANTES de adicionar à lista
  const calculoAtual = useMemo(() => {
    const nLargura = Number(larguraChapa) / 100;
    const nAltura = Number(alturaChapa) / 100;
    const areaChapa = nLargura * nAltura;

    const chaveMaterial = tipoMaterial === 'acrilico' ? espessuraChapa : tipoMaterial;
    const configMat = MATERIAIS_CONFIG[chaveMaterial] || { valorMetroQuadrado: 0, speed: 1, label: '' };

    let corPorcento = 1.0;
    if (tipoMaterial === 'acrilico') {
      if (corChapa === 'colorido') corPorcento = 1.2;
    }

    // Cálculo do corte (Laser/Router)
    const perimetro = (nLargura * 2 + nAltura * 2) * 100;
    const tempCorte = perimetro / configMat.speed;
    const minutosCorte = Math.floor(tempCorte / 60);
    const segundosCorte = (tempCorte % 60) / 100;

    let valorCorte = 0;
    if (minutosCorte === 0 && segundosCorte > 0) valorCorte = 3;
    else if (minutosCorte > 0) valorCorte = (minutosCorte + 1) * 3;

    const fatorPorcentagem = porcentagem / 100 + 1;
    const valorMaterialItem = (areaChapa * configMat.valorMetroQuadrado * corPorcento + valorCorte) * fatorPorcentagem;

    // Personalização
    const nLarguraPers = Number(larguraPers) / 100;
    const nAlturaPers = Number(alturaPers) / 100;
    const areaPers = nLarguraPers * nAlturaPers;
    const configPers = PERSONALIZACAO_CONFIG[tipoPers] || { valor: 0, label: '' };
    const valorPersItem = areaPers * configPers.valor * fatorPorcentagem;

    const valorUnitario = valorMaterialItem + valorPersItem;
    const valorTotalItem = valorUnitario * quantidade;

    // Montar texto descritivo deste item específico
    const labelMaterial = tipoMaterial === 'acrilico' 
      ? `Acrílico ${corChapa.toUpperCase()} ${espessuraChapa}mm` 
      : MATERIAIS_CONFIG[tipoMaterial]?.label || tipoMaterial;

    let txtItem = `- ${quantidade}x ${labelMaterial} (${larguraChapa}x${alturaChapa}cm)`;
    if (tipoPers !== 'nenhum') {
      txtItem += ` com Personalização em ${configPers.label} (${larguraPers}x${alturaPers}cm)`;
    }
    txtItem += `: R$ ${valorTotalItem.toFixed(2)}`;

    return {
      areaChapa,
      areaPers,
      valorMaterial: valorMaterialItem,
      valorPers: valorPersItem,
      valorTotalItem,
      minutosCorte,
      segundosCorte,
      txtItem
    };
  }, [tipoMaterial, corChapa, espessuraChapa, larguraChapa, alturaChapa, tipoPers, larguraPers, alturaPers, quantidade, porcentagem]);

  // Adiciona o material configurado na lista do orçamento
  const handleAdicionarItem = () => {
    if (!larguraChapa || !alturaChapa) return;

    const novoItem: ItemOrcamento = {
      id: crypto.randomUUID(),
      tipoMaterial,
      corChapa,
      espessuraChapa,
      larguraChapa: Number(larguraChapa),
      alturaChapa: Number(alturaChapa),
      tipoPers,
      larguraPers: Number(larguraPers),
      alturaPers: Number(alturaPers),
      quantidade,
      areaChapa: calculoAtual.areaChapa,
      areaPers: calculoAtual.areaPers,
      valorMaterial: calculoAtual.valorMaterial,
      valorPers: calculoAtual.valorPers,
      valorTotalItem: calculoAtual.valorTotalItem,
      descricaoTexto: calculoAtual.txtItem
    };

    setItens([...itens, novoItem]);
    
    // Resetar campos de dimensão para o próximo item
    setLarguraChapa('0');
    setAlturaChapa('0');
    setQuantidade(1);
  };

  const handleRemoverItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
  };

  // Valor total somando todos os itens adicionados
  const valorTotalOrcamento = useMemo(() => {
    return itens.reduce((acc, curr) => acc + curr.valorTotalItem, 0);
  }, [itens]);

  // Geração do texto final consolidado para envio no WhatsApp/Cópia
  const handleCopiarOrcamento = () => {
    if (itens.length === 0) return;

    const textoItens = itens.map(item => item.descricaoTexto).join('\n');

    const textoFinal = `*ORÇAMENTO GOIÂNIA ACRÍLICO*
----------------------------------------
${textoItens}
----------------------------------------
*VALOR TOTAL: R$ ${valorTotalOrcamento.toFixed(2)}*

*ENTRADA: R$ ${(valorTotalOrcamento / 2).toFixed(2)}*

Tempo médio para ser produzido de 5 dias úteis.
Para início da produção é solicitado 50% do valor antecipado e o restante no ato da retirada.
Forma de pagamento: Dinheiro, PIX ou cartão de crédito em 2x, e débito.
Retirar na loja, não estamos fazendo entrega.`;

    navigator.clipboard.writeText(textoFinal);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 text-gray-800 bg-gray-200">
      
      {/* COLUNA DA ESQUERDA: CONFIGURAÇÃO DO ITEM ATUAL */}
      <div className="space-y-6 lg:col-span-1">
        
        {/* Bloco Material */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-700 pb-2 border-b border-gray-100">1. Material</h2>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Tipo de Material</label>
            <select 
              value={tipoMaterial} 
              onChange={(e) => setTipoMaterial(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="acrilico">Acrílico</option>
              <option value="pvc">PVC</option>
              <option value="abs">ABS - Trotek</option>
              <option value="espelhado">Espelhado</option>
            </select>
          </div>

          {tipoMaterial === 'acrilico' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Cor do Acrílico</label>
                <select 
                  value={corChapa} 
                  onChange={(e) => setCorChapa(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="cristal">Cristal</option>
                  <option value="colorido">Colorido (1.2x)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Espessura</label>
                <select 
                  value={espessuraChapa} 
                  onChange={(e) => setEspessuraChapa(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {['2','3','4','5','6','8','10','12','15','20'].map(esp => (
                    <option key={esp} value={esp}>{esp}mm</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Largura (cm)</label>
              <input 
                type="number" 
                value={larguraChapa} 
                onChange={(e) => setLarguraChapa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Altura (cm)</label>
              <input 
                type="number" 
                value={alturaChapa} 
                onChange={(e) => setAlturaChapa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
              />
            </div>
          </div>
        </section>

        {/* Bloco Personalização */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-700 pb-2 border-b border-gray-100">2. Personalização</h2>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Tipo de Processo</label>
            <select 
              value={tipoPers} 
              onChange={(e) => setTipoPers(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {Object.entries(PERSONALIZACAO_CONFIG).map(([chave, conf]) => (
                <option key={chave} value={chave}>{conf.label}</option>
              ))}
            </select>
          </div>

          {tipoPers !== 'nenhum' && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Largura Pers. (cm)</label>
                <input 
                  type="number" 
                  value={larguraPers} 
                  onChange={(e) => setLarguraPers(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Altura Pers. (cm)</label>
                <input 
                  type="number" 
                  value={alturaPers} 
                  onChange={(e) => setAlturaPers(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
                />
              </div>
            </div>
          )}
        </section>

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
            <p><strong>Subtotal deste item:</strong> R$ {calculoAtual.valorTotalItem.toFixed(2)}</p>
            <p className="text-xs text-blue-600">Área: {calculoAtual.areaChapa.toFixed(4)} m² | Corte: {(calculoAtual.minutosCorte + calculoAtual.segundosCorte).toFixed(2)} min</p>
          </div>

          <button 
            type="button"
            onClick={handleAdicionarItem}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            + Adicionar ao Orçamento
          </button>
        </section>
      </div>

      {/* COLUNA DA DIREITA: LISTA DO ORÇAMENTO CONSOLIDADO (MÚLTIPLOS ITENS) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Parâmetros Globais de Margem */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border border-gray-100">
          <label className="font-semibold text-gray-600">Ajuste de Markup Global (%):</label>
          <input 
            type="number" 
            value={porcentagem} 
            onChange={(e) => setPorcentagem(Number(e.target.value))}
            className="w-24 p-2 border border-gray-300 rounded-lg text-center font-bold bg-gray-50"
          />
        </div>

        {/* Lista de Itens no Orçamento */}
        <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-4 min-h-[300px] flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-700 pb-3 border-b border-gray-100 mb-4">Resumo do Orçamento Multi-Material</h2>
            
            {itens.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Nenhum item adicionado ainda.</p>
                <p className="text-sm">Configure o material ao lado e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto pr-2">
                {itens.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center group">
                    <div className="space-y-0.5">
                      <p className="font-medium text-gray-900">
                        {item.quantidade}x {item.tipoMaterial === 'acrilico' ? `Acrílico ${item.corChapa} ${item.espessuraChapa}mm` : item.tipoMaterial.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Chapa: {item.larguraChapa}x{item.alturaChapa}cm ({item.areaChapa.toFixed(4)}m²) 
                        {item.tipoPers !== 'nenhum' && ` | Pers: ${item.tipoPers} (${item.larguraPers}x${item.alturaPers}cm)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-green-700">R$ {item.valorTotalItem.toFixed(2)}</span>
                      <button 
                        onClick={() => handleRemoverItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium p-1 opacity-80 group-hover:opacity-100 transition"
                        title="Remover item"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé com Valor Total e Cópia */}
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
                    : 'bg-green-600 text-white hover:bg-green-500'
              }`}
            >
              {copiado ? '✓ Copiado com Sucesso!' : 'Copiar Orçamento Consolidado'}
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}