"use client";

import React, { useState, useMemo } from 'react';
import { MATERIAIS_CONFIG, PERSONALIZACAO_CONFIG, CHAPA_CONFIG, ItemOrcamento, TAXAS_ORCAMENTO } from './constants';
import MenuLateral from './MenuLateral';
import FormEspecificacoes from './FormEspecificacoes';
import ResumoOrcamento from './ResumoOrcamento';

export default function CalculadorChapa() {
  const [isOpen, setIsOpen] = useState(false);
  const [modoCalculo, setModoCalculo] = useState<string>('chapa');
  const [tipoMaterial, setTipoMaterial] = useState<string>('acrilico');
  const [corChapa, setCorChapa] = useState<string>('cristal');
  const [espessuraChapa, setEspessuraChapa] = useState<string>('2');
  const [larguraChapa, setLarguraChapa] = useState<string>('0');
  const [alturaChapa, setAlturaChapa] = useState<string>('0');
  const [profundidadeCaixa, setProfundidadeCaixa] = useState<string>('0');
  const [tipoTampa, setTipoTampa] = useState<string>('semTampa');
  const [tipoPers, setTipoPers] = useState<string>('nenhum');
  const [larguraPers, setLarguraPers] = useState<string>('0');
  const [alturaPers, setAlturaPers] = useState<string>('0');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [copiado, setCopiado] = useState<boolean>(false);

  // Estados para o Checklist de Custos Adicionais
  const [temImposto, setTemImposto] = useState<boolean>(true);
  const [temMaoDeObra, setTemMaoDeObra] = useState<boolean>(true);
  const [temProjeto, setTemProjeto] = useState<boolean>(true);
  const [temEspecial, setTemEspecial] = useState<boolean>(false);

  const calculoAtual = useMemo(() => {
    // Calcula o multiplicador com base nos checkboxes marcados
    let porcentagemAcumulada = 0;
    if (temImposto) porcentagemAcumulada += TAXAS_ORCAMENTO.IMPOSTO;
    if (temMaoDeObra) porcentagemAcumulada += TAXAS_ORCAMENTO.MAO_DE_OBRA;
    if (temProjeto) porcentagemAcumulada += TAXAS_ORCAMENTO.PROJETO;
    if (temEspecial) porcentagemAcumulada += TAXAS_ORCAMENTO.ESPECIAL;

    const fatorAcrescimo = (porcentagemAcumulada / 100) + 1;

    if (modoCalculo === 'chapaInteira') {
      const chaveMaterial = tipoMaterial === 'acrilico' ? espessuraChapa : tipoMaterial;
      const configChapa = CHAPA_CONFIG[chaveMaterial] || { label: 'Chapa Inteira', valor: 0 };
      let corPorcento = (tipoMaterial === 'acrilico' && corChapa === 'colorido') ? 1.2 : 1.0;
      
      const valorUnitario = configChapa.valor * corPorcento * fatorAcrescimo;
      const valorTotalItem = valorUnitario * quantityExibida(quantidade);
      
      function quantityExibida(q: number) { return q; } // Auxiliar de escopo rápido

      // Condicional de texto para quantidade única ou múltipla
      const detalhePreco = quantidade === 1 
        ? `Valor: R$ ${valorUnitario.toFixed(2)}`
        : `Unitário: R$ ${valorUnitario.toFixed(2)} | Total: R$ ${valorTotalItem.toFixed(2)}`;

      const txtItem = `- ${quantidade}x ${configChapa.label} ${tipoMaterial === 'acrilico' ? corChapa.toUpperCase() : ''}\n  (${detalhePreco})`;

      return { areaChapa: 0, areaPers: 0, valorMaterial: valorUnitario, valorPers: 0, valorTotalItem, minutosCorte: 0, segundosCorte: 0, txtItem };
    }

    const nComprimento = Number(larguraChapa) / 100;
    const nAltura = Number(alturaChapa) / 100;
    const nLargura = Number(profundidadeCaixa) / 100;
    const chaveMaterial = tipoMaterial === 'acrilico' ? espessuraChapa : tipoMaterial;
    const configMat = MATERIAIS_CONFIG[chaveMaterial] || { valorMetroQuadrado: 0, speed: 1, label: '' };

    let espessuraCalculoCaixa = 0;
    if (modoCalculo === 'caixa') {
      const espessurasMap: { [key: string]: number } = {
        '2': 211, '3': 311.47, '4': 414.84, '5': 518.56, '6': 622.28, '8': 829.70, '10': 1037.12, '12': 1360.98, '15': 1701.23, '20': 2401.73
      };
      espessuraCalculoCaixa = espessurasMap[espessuraChapa] || 0;
    }

    let corPorcento = (tipoMaterial === 'acrilico' && corChapa === 'colorido') ? 1.2 : 1.0;
    let areaChapa = 0;
    let perimetro = 0;

    if (modoCalculo === 'chapa') {
      areaChapa = nComprimento * nAltura;
      perimetro = (nComprimento * 2 + nAltura * 2) * 100;
    } else {
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

    // ================= CORREÇÃO EXCLUSIVA DA EXIBIÇÃO =================
    const tempCorteSegundos = perimetro / configMat.speed;
    const minutosTotaisExatos = tempCorteSegundos / 60; 
    const valorCorte = minutosTotaisExatos * 3;

    const minutosCorte = Math.floor(tempCorteSegundos / 60);
    const segundosCorte = Math.round(tempCorteSegundos % 60);
    // ===================================================================

    const valorMetroBase = modoCalculo === 'chapa' ? configMat.valorMetroQuadrado : espessuraCalculoCaixa;
    const valorMaterialItem = (areaChapa * valorMetroBase * corPorcento + valorCorte) * fatorAcrescimo;

    const areaPers = (Number(larguraPers) / 100) * (Number(alturaPers) / 100);
    const configPers = PERSONALIZACAO_CONFIG[tipoPers] || { valor: 0, label: '' };
    const valorPersItem = areaPers * configPers.valor * fatorAcrescimo;
    
    // Cálculo final dos valores
    const valorUnitario = valorMaterialItem + valorPersItem;
    const valorTotalItem = valorUnitario * quantidade;

    const labelMaterial = tipoMaterial === 'acrilico' ? `Acrílico ${corChapa.toUpperCase()} ${espessuraChapa}mm` : MATERIAIS_CONFIG[tipoMaterial]?.label || tipoMaterial;
    let txtItem = modoCalculo === 'chapa' ? `- ${quantidade}x ${labelMaterial} (${larguraChapa}x${alturaChapa}cm)` : `- ${quantidade}x Caixa em ${labelMaterial}, medindo ${larguraChapa}x${profundidadeCaixa}x${alturaChapa}cm [${tipoTampa}]`;
    if (tipoPers !== 'nenhum') txtItem += ` com Personalização em ${configPers.label} (${larguraPers}x${alturaPers}cm)`;
    
    // Aplicação da regra condicional aqui também
    const detalhePrecoDinamico = quantidade === 1 
      ? `Valor: R$ ${valorUnitario.toFixed(2)}`
      : `Unitário: R$ ${valorUnitario.toFixed(2)} | Total: R$ ${valorTotalItem.toFixed(2)}`;

    txtItem += `\n  (${detalhePrecoDinamico})`;

    return { areaChapa, areaPers, valorMaterial: valorUnitario, valorPers: valorPersItem, valorTotalItem, minutosCorte, segundosCorte, txtItem };
  }, [modoCalculo, tipoMaterial, corChapa, espessuraChapa, larguraChapa, alturaChapa, profundidadeCaixa, tipoTampa, tipoPers, larguraPers, alturaPers, quantidade, temImposto, temMaoDeObra, temProjeto, temEspecial]);

  const handleAdicionarItem = () => {
    if (modoCalculo !== 'chapaInteira' && (Number(larguraChapa) <= 0 || Number(alturaChapa) <= 0)) return alert("Medidas inválidas!");
    if (modoCalculo === 'caixa' && Number(profundidadeCaixa) <= 0) return alert("Largura da caixa inválida!");

    const novoItem: ItemOrcamento = {
      id: `item-${Date.now()}`,
      tipoMaterial: modoCalculo === 'caixa' ? `Caixa (${tipoMaterial})` : tipoMaterial,
      corChapa, espessuraChapa, larguraChapa: Number(larguraChapa), alturaChapa: Number(alturaChapa),
      tipoPers, larguraPers: Number(larguraPers), alturaPers: Number(alturaPers), quantidade,
      areaChapa: calculoAtual.areaChapa, areaPers: calculoAtual.areaPers, valorMaterial: calculoAtual.valorMaterial,
      valorPers: calculoAtual.valorPers, valorTotalItem: calculoAtual.valorTotalItem, descricaoTexto: calculoAtual.txtItem
    };
    setItens([...itens, novoItem]);
    setQuantidade(1);
  };

  const valorTotalOrcamento = useMemo(() => itens.reduce((acc, curr) => acc + curr.valorTotalItem, 0), [itens]);

  const handleCopiarOrcamento = () => {
    const textoFinal = `*ORÇAMENTO GOIÂNIA ACRÍLICO*\n-------------------------------------\n${itens.map(i => i.descricaoTexto).join('\n\n')}\n-------------------------------------\n*TOTAL: R$ ${valorTotalOrcamento.toFixed(2)}*\n\n*ENTRADA: R$ ${(valorTotalOrcamento / 2).toFixed(2)}*\n\nTempo médio para ser produzido de 5 dias úteis.\nPara início da produção é solicitado 50% do valor antecipado e o restante no ato da retirada.\nForma de pagamento: Dinheiro, PIX ou cartão de crédito em 2x, e débito.\nRetirar na loja, não estamos fazendo entrega.`;
    navigator.clipboard.writeText(textoFinal).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <main>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed top-5 left-5 z-50 p-2 text-white bg-blue-600 rounded-md shadow-md hover:cursor-pointer">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      <MenuLateral isOpen={isOpen} />

      <div className="lg:max-w-4/5 mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6 text-gray-800 bg-gray-200 min-h-screen">
        <FormEspecificacoes
          modoCalculo={modoCalculo} setModoCalculo={setModoCalculo}
          tipoMaterial={tipoMaterial} setTipoMaterial={setTipoMaterial}
          corChapa={corChapa} setCorChapa={setCorChapa}
          espessuraChapa={espessuraChapa} setEspessuraChapa={setEspessuraChapa}
          larguraChapa={larguraChapa} setLarguraChapa={setLarguraChapa}
          alturaChapa={alturaChapa} setAlturaChapa={setAlturaChapa}
          profundidadeCaixa={profundidadeCaixa} setProfundidadeCaixa={setProfundidadeCaixa}
          tipoTampa={tipoTampa} setTipoTampa={setTipoTampa}
          tipoPers={tipoPers} setTipoPers={setTipoPers}
          larguraPers={larguraPers} setLarguraPers={setLarguraPers}
          alturaPers={alturaPers} setAlturaPers={setAlturaPers}
          temImposto={temImposto} setTemImposto={setTemImposto}
          temMaoDeObra={temMaoDeObra} setTemMaoDeObra={setTemMaoDeObra}
          temProjeto={temProjeto} setTemProjeto={setTemProjeto}
          temEspecial={temEspecial} setTemEspecial={setTemEspecial}
        />

        <ResumoOrcamento
          itens={itens} quantidade={quantidade} setQuantidade={setQuantidade}
          calculoAtual={calculoAtual} handleAdicionarItem={handleAdicionarItem}
          handleRemoverItem={(id) => setItens(itens.filter(i => i.id !== id))}
          valorTotalOrcamento={valorTotalOrcamento} handleCopiarOrcamento={handleCopiarOrcamento}
          copiado={copiado}
        />
      </div>
    </main>
  );
}