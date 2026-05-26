'use client';

import React, { useState, useMemo } from 'react';
import { MATERIAIS_CONFIG, PERSONALIZACAO_CONFIG, ItemOrcamento } from './constants';

export default function CalculadorChapa() {
  // Ajuste global de markup
  const [porcentagem, setPorcentagem] = useState<number>(65);

  // MODO: chapa | caixa
  const [modoCalculo, setModoCalculo] = useState<string>('chapa');

  // Estados do Formulário Atual (Compartilhados)
  const [tipoMaterial, setTipoMaterial] = useState<string>('acrilico');
  const [corChapa, setCorChapa] = useState<string>('cristal');
  const [espessuraChapa, setEspessuraChapa] = useState<string>('2');
  const [larguraChapa, setLarguraChapa] = useState<string>('0'); // X
  const [alturaChapa, setAlturaChapa] = useState<string>('0');   // Y
  
  // Estados específicos para Caixa
  const [profundidadeCaixa, setProfundidadeCaixa] = useState<string>('0'); // Z
  const [tipoTampa, setTipoTampa] = useState<string>('semTampa');

  // Personalização e Quantidade
  const [tipoPers, setTipoPers] = useState<string>('nenhum');
  const [larguraPers, setLarguraPers] = useState<string>('0');
  const [alturaPers, setAlturaPers] = useState<string>('0');
  const [quantidade, setQuantidade] = useState<number>(1);

  // Lista de materiais adicionados ao orçamento atual
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [copiado, setCopiado] = useState<boolean>(false);

  // Função interna para calcular os valores em tempo real ANTES de adicionar à lista
  const calculoAtual = useMemo(() => {
    const nLargura = Number(larguraChapa) / 100; // X
    const nAltura = Number(alturaChapa) / 100;   // Y
    const nProfundidade = Number(profundidadeCaixa) / 100; // Z

    const chaveMaterial = tipoMaterial === 'acrilico' ? espessuraChapa : tipoMaterial;
    const configMat = MATERIAIS_CONFIG[chaveMaterial] || { valorMetroQuadrado: 0, speed: 1, label: '' };

    // Fator de espessura adaptativo para o cálculo legado de caixas
    let espessuraCalculoCaixa = 0;
    if (modoCalculo === 'caixa') {
      const espessurasMap: { [key: string]: number } = {
        '2': 211, '3': 311.47, '4': 414.84, '5': 518.56, '6': 622.28,
        '8': 829.70, '10': 1037.12, '12': 1360.98, '15': 1701.23, '20': 2401.73
      };
      espessuraCalculoCaixa = espessurasMap[espessuraChapa] || 0;
    }

    let corPorcento = 1.0;
    if (tipoMaterial === 'acrilico' && corChapa === 'colorido') {
      corPorcento = 1.2;
    }

    let areaChapa = 0;
    let perimetro = 0;

    // LÓGICA DE GEOMETRIA: CHAPA VS CAIXA
    if (modoCalculo === 'chapa') {
      areaChapa = nLargura * nAltura;
      perimetro = (nLargura * 2 + nAltura * 2) * 100;
    } else {
      // Cálculos herdados do seu sistema de caixas
      if (tipoTampa === 'semTampa') {
        areaChapa = (nLargura * nAltura * 1) + (nLargura * nProfundidade * 2) + (nAltura * nProfundidade * 2);
        perimetro = (nLargura * 6 + nAltura * 6 + nProfundidade * 8) * 100;
      } else if (tipoTampa === 'tampaLacrada') {
        areaChapa = (nLargura * nAltura * 2) + (nLargura * nProfundidade * 2) + (nAltura * nProfundidade * 2);
        perimetro = (nLargura * 8 + nAltura * 8 + nProfundidade * 8) * 100;
      } else if (tipoTampa === 'tampa3cm' && nLargura > 0) {
        areaChapa = (nLargura * nAltura * 2) + (nLargura * nProfundidade * 2) + (nAltura * nProfundidade * 2) + (nLargura * 0.03 * 2) + (nAltura * 0.03 * 2);
        perimetro = (nLargura * 12 + nAltura * 12 + nProfundidade * 8 + (0.03 * 8)) * 100;
      } else {
        // Tampa Total
        areaChapa = (nLargura * nAltura * 2) + (nLargura * nProfundidade * 2) + (nAltura * nProfundidade * 2) + (nLargura * nProfundidade * 2) + (nAltura * nProfundidade * 2);
        perimetro = (nLargura * 12 + nAltura * 12 + nProfundidade * 16) * 100;
      }
    }

    // Cálculo do corte (Laser/Router)
    const tempCorte = perimetro / configMat.speed;
    const minutosCorte = Math.floor(tempCorte / 60);
    const segundosCorte = (tempCorte % 60) / 100;

    let valorCorte = 0;
    if (minutosCorte === 0 && segundosCorte > 0) valorCorte = 3;
    else if (minutosCorte > 0) valorCorte = (minutosCorte + 1) * 3;

    const fatorPorcentagem = porcentagem / 100 + 1;
    
    // Define o valor base do material aplicando a respectiva tabela de preços
    const valorMetroBase = modoCalculo === 'chapa' ? configMat.valorMetroQuadrado : espessuraCalculoCaixa;
    const valorMaterialItem = (areaChapa * valorMetroBase * corPorcento + valorCorte) * fatorPorcentagem;

    // Personalização
    const nLarguraPers = Number(larguraPers) / 100;
    const nAlturaPers = Number(alturaPers) / 100;
    const areaPers = nLarguraPers * nAlturaPers;
    const configPers = PERSONALIZACAO_CONFIG[tipoPers] || { valor: 0, label: '' };
    const valorPersItem = areaPers * configPers.valor * fatorPorcentagem;

    const valorUnitario = valorMaterialItem + valorPersItem;
    const valorTotalItem = valorUnitario * quantidade;

    // Montagem da descrição textual estruturada para o clipboard
    const labelMaterial = tipoMaterial === 'acrilico' 
      ? `Acrílico ${corChapa.toUpperCase()} ${espessuraChapa}mm` 
      : MATERIAIS_CONFIG[tipoMaterial]?.label || tipoMaterial;

    let txtItem = '';
    if (modoCalculo === 'chapa') {
      txtItem = `- ${quantidade}x ${labelMaterial} (${larguraChapa}x${alturaChapa}cm)`;
    } else {
      let descTampa = '';
      if (tipoTampa === 'semTampa') descTampa = 'Sem tampa';
      else if (tipoTampa === 'tampaLacrada') descTampa = 'Tampa lacrada';
      else if (tipoTampa === 'tampa3cm') descTampa = 'Encaixe com abas de 3cm';
      else descTampa = 'Encaixe com abas na medida total da altura';

      txtItem = `- ${quantidade}x Caixa em ${labelMaterial}, medindo ${larguraChapa}x${alturaChapa}x${profundidadeCaixa}cm (LxAxP) [${descTampa}]`;
    }

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
  }, [modoCalculo, tipoMaterial, corChapa, espessuraChapa, larguraChapa, alturaChapa, profundidadeCaixa, tipoTampa, tipoPers, larguraPers, alturaPers, quantidade, porcentagem]);

  const handleAdicionarItem = () => {
    if (!larguraChapa || !alturaChapa) return;
    if (modoCalculo === 'caixa' && !profundidadeCaixa) return;

    const novoItem: ItemOrcamento = {
      id: crypto.randomUUID(),
      tipoMaterial: modoCalculo === 'caixa' ? `Caixa (${tipoMaterial})` : tipoMaterial,
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
    
    // Resetar campos padrão
    setLarguraChapa('0');
    setAlturaChapa('0');
    setProfundidadeCaixa('0');
    setQuantidade(1);
  };

  const handleRemoverItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
  };

  const valorTotalOrcamento = useMemo(() => {
    return itens.reduce((acc, curr) => acc + curr.valorTotalItem, 0);
  }, [itens]);

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
      
      {/* COLUNA DA ESQUERDA: CONFIGURAÇÃO DO ITEM */}
      <div className="space-y-6 lg:col-span-1">
        
        {/* Seletor de Modo de Operação */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex gap-2 border border-gray-100">
          <button
            type="button"
            onClick={() => { setModoCalculo('chapa'); setTipoMaterial('acrilico'); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${modoCalculo === 'chapa' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Chapa Cortada
          </button>
          <button
            type="button"
            onClick={() => { setModoCalculo('caixa'); setTipoMaterial('acrilico'); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${modoCalculo === 'caixa' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Caixa em acrilico
          </button>
        </div>

        {/* Bloco Material */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-700 pb-2 border-b border-gray-100">1. Especificações</h2>
          
          {modoCalculo === 'chapa' ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Tipo de Material</label>
              <select 
                value={tipoMaterial} 
                onChange={(e) => setTipoMaterial(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
              >
                <option value="acrilico">Acrílico</option>
                <option value="pvc">PVC</option>
                <option value="abs">ABS - Trotek</option>
                <option value="espelhado">Espelhado</option>
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Tipo de Tampa da Caixa</label>
              <select
                value={tipoTampa}
                onChange={(e) => setTipoTampa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none font-medium"
              >
                <option value="semTampa">Sem Tampa</option>
                <option value="tampaLacrada">Tampa Lacrada</option>
                <option value="tampa3cm">Tampa Encaixe (Abas 3cm)</option>
                <option value="tampaTotal">Tampa Encaixe (Medida Total)</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Cor do Material</label>
            <select 
              value={corChapa} 
              onChange={(e) => setCorChapa(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
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
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
            >
              {['2','3','4','5','6','8','10','12','15','20'].map(esp => (
                <option key={esp} value={esp}>{esp}mm</option>
              ))}
            </select>
          </div>

          {/* Dimensões Dinâmicas */}
          <div className={`grid gap-4 pt-2 ${modoCalculo === 'chapa' ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Largura X (cm)</label>
              <input 
                type="number" 
                value={larguraChapa} 
                onChange={(e) => setLarguraChapa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Altura Y (cm)</label>
              <input 
                type="number" 
                value={alturaChapa} 
                onChange={(e) => setAlturaChapa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
              />
            </div>
            {modoCalculo === 'caixa' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Profund. Z (cm)</label>
                <input 
                  type="number" 
                  value={profundidadeCaixa} 
                  onChange={(e) => setProfundidadeCaixa(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center focus:border-blue-500 font-bold"
                />
              </div>
            )}
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
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
            >
              {Object.entries(PERSONALIZACAO_CONFIG).map(([chave, conf]) => (
                <option key={chave} value={chave}>{conf.label}</option>
              ))}
            </select>
          </div>

          {tipoPers !== 'nenhum' && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Largura (cm)</label>
                <input 
                  type="number" 
                  value={larguraPers} 
                  onChange={(e) => setLarguraPers(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Altura (cm)</label>
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
            <p><strong>Subtotal do Item:</strong> R$ {calculoAtual.valorTotalItem.toFixed(2)}</p>
            <p className="text-xs text-blue-600">Área Desenvolvida: {calculoAtual.areaChapa.toFixed(4)} m² | Corte: {(calculoAtual.minutosCorte + calculoAtual.segundosCorte).toFixed(2)} min</p>
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

      {/* COLUNA DA DIREITA: ORÇAMENTO CONSOLIDADO MULTI-MATERIAL */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border border-gray-100">
          <label className="font-semibold text-gray-600">Ajuste de Markup Global (%):</label>
          <input 
            type="number" 
            value={porcentagem} 
            onChange={(e) => setPorcentagem(Number(e.target.value))}
            className="w-24 p-2 border border-gray-300 rounded-lg text-center font-bold bg-gray-50"
          />
        </div>

        <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-4 min-h-[450px] flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-700 pb-3 border-b border-gray-100 mb-4">Resumo do Orçamento Multi-Material</h2>
            
            {itens.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Nenhum item adicionado ainda.</p>
                <p className="text-sm">Configure a chapa ou caixa ao lado e adicione à lista.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto pr-2">
                {itens.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center group">
                    <div className="space-y-0.5">
                      <p className="font-medium text-gray-900">{item.descricaoTexto.split(':')[0]}</p>
                      <p className="text-xs text-gray-500">
                        Área total calculada: {item.areaChapa.toFixed(4)}m² {item.larguraPers > 0 && `| Área Pers: ${item.areaPers.toFixed(4)}m²`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-green-700">R$ {item.valorTotalItem.toFixed(2)}</span>
                      <button 
                        onClick={() => handleRemoverItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium p-1 transition"
                      >
                        Remover
                      </button>
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