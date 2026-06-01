'use client';
import { Eye, Pencil, Trash2 } from 'lucide-react';

import React, { useState, useMemo } from 'react';
import { MATERIAIS_CONFIG, PERSONALIZACAO_CONFIG, CHAPA_CONFIG, ItemOrcamento } from './constants';

export default function CalculadorChapa() {
  // Ajuste global de markup
  const [porcentagem, setPorcentagem] = useState<number>(65);

  // MODO: chapa | caixa
  const [modoCalculo, setModoCalculo] = useState<string>('chapa');

  // Estados do Formulário Atual (Compartilhados)
  const [tipoMaterial, setTipoMaterial] = useState<string>('acrilico');
  const [corChapa, setCorChapa] = useState<string>('cristal');
  const [espessuraChapa, setEspessuraChapa] = useState<string>('2');

  // Mapeamento correto: Comprimento (X) e Altura da Chapa (Y) para o modo chapa. 
  // No modo caixa: larguraChapa = Comprimento (C), alturaChapa = Altura (A), profundidadeCaixa = Largura (L)
  const [larguraChapa, setLarguraChapa] = useState<string>('0'); // Comprimento (C)
  const [alturaChapa, setAlturaChapa] = useState<string>('0');   // Altura (A)

  // Estados específicos para Caixa
  const [profundidadeCaixa, setProfundidadeCaixa] = useState<string>('0'); // Largura (L)
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
    // 1. ATALHO DIRETO PARA CHAPA INTEIRA (Preço Fixo da Lista)
    if (modoCalculo === 'chapaInteira') {
      const chaveMaterial = tipoMaterial === 'acrilico' ? espessuraChapa : tipoMaterial;
      const configChapa = CHAPA_CONFIG[chaveMaterial] || { label: 'Chapa Inteira', valor: 0 };

      // Aplica a cor (se for acrílico colorido aumenta 20%)
      let corPorcento = 1.0;
      if (tipoMaterial === 'acrilico' && corChapa === 'colorido') {
        corPorcento = 1.2;
      }

      const fatorPorcentagem = porcentagem / 100 + 1;

      // Cálculo final simplificado
      const valorUnitario = configChapa.valor * corPorcento * fatorPorcentagem;
      const valorTotalItem = valorUnitario * quantidade;

      const txtItem = `- ${quantidade}x ${configChapa.label} ${tipoMaterial === 'acrilico' ? corChapa.toUpperCase() : ''}: R$ ${valorTotalItem.toFixed(2)}`;

      return {
        areaChapa: 0, // Mantém o padrão que você definiu
        areaPers: 0,
        valorMaterial: valorTotalItem,
        valorPers: 0,
        valorTotalItem,
        minutosCorte: 0,
        segundosCorte: 0,
        txtItem
      };
    }

    // 2. CÁLCULOS RESTANTES (Chapa Fracionada e Caixas)
    const nComprimento = Number(larguraChapa) / 100;
    const nAltura = Number(alturaChapa) / 100;
    const nLargura = Number(profundidadeCaixa) / 100;

    const chaveMaterial = tipoMaterial === 'acrilico' ? espessuraChapa : tipoMaterial;
    const configMat = MATERIAIS_CONFIG[chaveMaterial] || { valorMetroQuadrado: 0, speed: 1, label: '' };

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

    if (modoCalculo === 'chapa') {
      areaChapa = nComprimento * nAltura;
      perimetro = (nComprimento * 2 + nAltura * 2) * 100;
    } else {
      // Aqui entram as fórmulas das caixas perfeitamente isoladas
      if (tipoTampa === 'semTampa') {
        areaChapa = (nComprimento * nLargura * 1) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
        perimetro = (nComprimento * 6 + nLargura * 6 + nAltura * 8) * 100;
      } else if (tipoTampa === 'tampaLacrada') {
        areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
        perimetro = (nComprimento * 8 + nLargura * 8 + nAltura * 8) * 100;
      } else if (tipoTampa === 'tampa3cm' && nComprimento > 0) {
        areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2) + (nComprimento * 0.03 * 2) + (nLargura * 0.03 * 2);
        perimetro = (nComprimento * 12 + nLargura * 12 + nAltura * 8 + (0.03 * 8)) * 100;
      } else {
        areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
        perimetro = (nComprimento * 12 + nLargura * 12 + nAltura * 16) * 100;
      }
    }

    const tempCorte = perimetro / configMat.speed;
    const minutosCorte = Math.floor(tempCorte / 60);
    const segundosCorte = (tempCorte % 60) / 100;

    let valorCorte = 0;
    if (minutosCorte === 0 && segundosCorte > 0) valorCorte = 3;
    else if (minutosCorte > 0) valorCorte = (minutosCorte + 1) * 3;

    const fatorPorcentagem = porcentagem / 100 + 1;

    const valorMetroBase = modoCalculo === 'chapa' ? configMat.valorMetroQuadrado : espessuraCalculoCaixa;
    const valorMaterialItem = (areaChapa * valorMetroBase * corPorcento + valorCorte) * fatorPorcentagem;

    const nLarguraPers = Number(larguraPers) / 100;
    const nAlturaPers = Number(alturaPers) / 100;
    const areaPers = nLarguraPers * nAlturaPers;
    const configPers = PERSONALIZACAO_CONFIG[tipoPers] || { valor: 0, label: '' };
    const valorPersItem = areaPers * configPers.valor * fatorPorcentagem;

    const valorUnitario = valorMaterialItem + valorPersItem;
    const valorTotalItem = valorUnitario * quantidade;

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

      txtItem = `- ${quantidade}x Caixa em ${labelMaterial}, medindo ${larguraChapa}x${profundidadeCaixa}x${alturaChapa}cm (CxLxA) [${descTampa}]`;
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
    const nComprimento = Number(larguraChapa);
    const nAltura = Number(alturaChapa);
    const nLargura = Number(profundidadeCaixa);

    if (modoCalculo != 'chapaInteira') {
      if (isNaN(nComprimento) || nComprimento <= 0 || isNaN(nAltura) || nAltura <= 0) {
        alert("Por favor, insira medidas válidas maiores que zero.");
        return;
      }
    }

    if (modoCalculo === 'caixa' && (isNaN(nLargura) || nLargura <= 0)) {
      alert("Por favor, insira uma largura válida maior que zero para a caixa.");
      return;
    }

    const novoItem: ItemOrcamento = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tipoMaterial: modoCalculo === 'caixa' ? `Caixa (${tipoMaterial})` : tipoMaterial,
      corChapa,
      espessuraChapa,
      larguraChapa: nComprimento,
      alturaChapa: nAltura,
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

    // Resetar campos
    //setLarguraChapa('0');
    //setAlturaChapa('0');
    //setProfundidadeCaixa('0');
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

    const textoItens = itens.map(item => item.descricaoTexto).join('\n\n');

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

    try {
      const textArea = document.createElement("textarea");
      textArea.value = textoFinal;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const copiadoSucesso = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (copiadoSucesso) {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      } else {
        alert("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
      }
    } catch (err) {
      console.error("Erro no fallback de cópia: ", err);
      alert("Erro ao copiar o orçamento.");
    }
  };

  return (
    <main className="lg:max-w-4/5 mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6 text-gray-800 bg-gray-200">

      {/* COLUNA DA ESQUERDA: CONFIGURAÇÃO DO ITEM */}
      <div className="space-y-6 lg:col-span-2">

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
          <button
            type="button"
            onClick={() => { setModoCalculo('chapaInteira'); setTipoMaterial('acrilico'); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${modoCalculo === 'chapaInteira' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Chapa Inteira
          </button>
        </div>

        {/* Bloco Material */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-700 pb-2 border-b border-gray-100">1. Especificações</h2>

          {/* 1. SELEÇÃO DE ACORDO COM O MODO DE CÁLCULO */}
          {modoCalculo === 'chapa' && (
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
          )}

          {modoCalculo === 'caixa' && (
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

          {modoCalculo === 'chapaInteira' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Tipo de Material (Chapa Inteira)</label>
              <select
                value={tipoMaterial}
                onChange={(e) => setTipoMaterial(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
              >
                {/* Aqui você pode listar apenas o que vende em chapa fechada */}
                <option value="acrilico">Acrílico</option>
                <option value="pvc">PVC</option>
                <option value="abs">ABS-Trotek</option>
                <option value="espelhado">Espelhado</option>
                <option value="psai">PS AI</option>
              </select>
            </div>
          )}

          {/* 2. FILTRO DE COR E ESPESSURA (Aparece para Chapa Comum e Chapa Inteira) */}
          {(tipoMaterial === "acrilico") && (
            <>
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
                  {['2', '3', '4', '5', '6', '8', '10', '12', '15', '20'].map(esp => (
                    <option key={esp} value={esp}>{esp}mm</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* 3. INPUTS DE DIMENSÕES (SÓ APARECEM SE NÃO FOR CHAPA INTEIRA) */}
          {modoCalculo !== 'chapaInteira' ? (
            <div className={`grid gap-4 pt-2 ${modoCalculo === 'chapa' ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Comprimento X (cm)
                </label>
                <input
                  type="number"
                  value={larguraChapa}
                  onChange={(e) => setLarguraChapa(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center font-semibold"
                />
              </div>

              {modoCalculo === 'caixa' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Largura Y (cm)</label>
                  <input
                    type="number"
                    value={profundidadeCaixa}
                    onChange={(e) => setProfundidadeCaixa(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center font-semibold focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  {modoCalculo === 'chapa' ? 'Largura Y (cm)' : 'Altura Z (cm)'}
                </label>
                <input
                  type="number"
                  value={alturaChapa}
                  onChange={(e) => setAlturaChapa(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center font-semibold"
                />
              </div>
            </div>
          ) : (
            /* AVISO VISUAL PRO USUÁRIO NO LUGAR DOS INPUTS */
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium text-center">
              Cálculo baseado na medida padrão da chapa inteira (2x1 metros ou correspondente).
            </div>
          )}
        </section>

        {/* Bloco Personalização */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-700 pb-2 border-b border-gray-100">2. Personalização</h2>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Tipo de Personalização</label>
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
                <label className="text-sm font-medium text-gray-600">Comprimento (cm)</label>
                <input
                  type="number"
                  value={larguraPers}
                  onChange={(e) => setLarguraPers(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Largura (cm)</label>
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

        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border border-gray-100">
          <label className="font-semibold text-gray-600">Ajuste de Markup Global (%):</label>
          <input
            type="number"
            value={porcentagem}
            onChange={(e) => setPorcentagem(Number(e.target.value))}
            className="w-24 p-2 border border-gray-300 rounded-lg text-center font-bold bg-gray-50"
          />
        </div>

      </div>

      {/* COLUNA DA DIREITA: ORÇAMENTO CONSOLIDADO */}
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
                      <p className="font-medium text-gray-900">{item.descricaoTexto.split(':')[0]}</p>
                      <p className="text-xs text-gray-500">
                        Área total calculada: {item.areaChapa.toFixed(4)}m² {item.tipoPers != 'nenhum' && `| Área Pers: ${item.areaPers.toFixed(4)}m²`}
                      </p>
                    </div>
                    <div className="flex flex-col  gap-4">
                      <span className="font-bold text-lg text-green-700 text-center">R$ {item.valorTotalItem.toFixed(2)}</span>
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
              className={`w-full py-4 text-xl font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 ${itens.length === 0
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

        <div className='flex justify-end'>
          <button className='bg-red-600 px-10 py-2 text-2xl text-white rounded-full 
          hover:bg-red-700 hover:cursor-pointer' onClick={() => window.location.reload()}>Limpar Tudo</button>

        </div>
      </div>
    </main>
  );
}