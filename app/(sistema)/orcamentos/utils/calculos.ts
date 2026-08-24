// utils/calculos.ts
import { MATERIAIS_CONFIG, CHAPA_CONFIG, PERSONALIZACAO_CONFIG } from './constants';

// Criamos uma interface para receber todos os dados que a função precisa
interface DadosCalculo {
  modoCalculo: string;
  tipoMaterial: string;
  corChapa: string;
  espessuraChapa: string;
  comprimentoChapa: string;
  larguraChapa: string;
  profundidadeCaixa: string;
  tipoTampa: string;
  tipoPers: string;
  larguraPers: string;
  alturaPers: string;
  quantidade: number;
  temImposto: boolean;
  temMaoDeObra: boolean;
  temProjeto: boolean;
  temEspecial: boolean;
}


// Essa função só faz MATEMÁTICA, não sabe o que é React nem estado!
export function calcularOrcamentoItem(dados: DadosCalculo) {
  // 1. Calcular Taxas
  let porcentagemAcumulada = 0;
  if (dados.temImposto) porcentagemAcumulada += 15;
  if (dados.temMaoDeObra) porcentagemAcumulada += 30;
  if (dados.temProjeto) porcentagemAcumulada += 35;
  if (dados.temEspecial) porcentagemAcumulada += 35;

  const fatorAcrescimo = (porcentagemAcumulada / 100) + 1;

  // Lógica de Chapa Inteira
  if (dados.modoCalculo === 'chapa') {
    const chaveMaterial = dados.tipoMaterial === 'Acrílico' ? dados.espessuraChapa : dados.tipoMaterial;
    const configChapa = CHAPA_CONFIG[chaveMaterial] || { label: 'Chapa Inteira', valor: 0 };
    let corPorcento = (dados.tipoMaterial === 'Acrílico' && dados.corChapa === 'colorido') ? 1.2 : 1.0;

    const valorBaseUnitario = configChapa.valor * corPorcento;
    const valorUnitarioFinal = valorBaseUnitario * fatorAcrescimo;
    const valorTotalItem = valorUnitarioFinal * dados.quantidade;

    const detalhePreco = dados.quantidade === 1
      ? `Valor: R$ ${valorUnitarioFinal.toFixed(2)}`
      : `Unitário: R$ ${valorUnitarioFinal.toFixed(2)} | Total: R$ ${valorTotalItem.toFixed(2)}`;

    const txtItem = `- ${dados.quantidade}x ${configChapa.label} ${dados.tipoMaterial === 'Acrílico' ? dados.corChapa.toUpperCase() : ''}\n  (${detalhePreco})`;

    return {
      areaChapa: 0,
      areaPers: 0,
      valorBaseUnitario,
      valorMaterial: valorUnitarioFinal,
      valorPers: 0,
      valorTotalItem,
      minutosCorte: 0,
      segundosCorte: 0,
      porcentagemAcumulada,
      txtItem
    };
  }

  // --- Lógica para 'chapa' e 'caixa' ---
  const nComprimento = Number(dados.comprimentoChapa) / 100;
  const nAltura = Number(dados.larguraChapa) / 100;
  const nLargura = Number(dados.profundidadeCaixa) / 100;
  const chaveMaterial = dados.tipoMaterial === 'Acrílico' ? dados.espessuraChapa : dados.tipoMaterial;
  const configMat = MATERIAIS_CONFIG[chaveMaterial] || { valorMetroQuadrado: 0, speed: 1, label: '' };

  let espessuraCalculoCaixa = 0;
  if (dados.modoCalculo === 'caixa') {
    const espessurasMap: { [key: string]: number } = {
      '2': 211, '3': 311.47, '4': 414.84, '5': 518.56, '6': 622.28, '8': 829.70, '10': 1037.12, '12': 1360.98, '15': 1701.23, '20': 2401.73
    };
    espessuraCalculoCaixa = espessurasMap[dados.espessuraChapa] || 0;
  }

  let corPorcento = (dados.tipoMaterial === 'Acrílico' && dados.corChapa === 'colorido') ? 1.2 : 1.0;
  let areaChapa = 0;
  let perimetro = 0;

  if (dados.modoCalculo === 'corte') {
    areaChapa = nComprimento * nAltura;
    perimetro = (nComprimento * 2 + nAltura * 2) * 100;
  } else {
    if (dados.tipoTampa === 'semTampa') {
      areaChapa = (nComprimento * nLargura * 1) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
      perimetro = (nComprimento * 6 + nLargura * 6 + nAltura * 8) * 100;
    } else if (dados.tipoTampa === 'tampaLacrada') {
      areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
      perimetro = (nComprimento * 8 + nLargura * 8 + nAltura * 8) * 100;
    } else if (dados.tipoTampa === 'tampa3cm' && nComprimento > 0) {
      areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2) + (nComprimento * 0.03 * 2) + (nLargura * 0.03 * 2);
      perimetro = (nComprimento * 12 + nLargura * 12 + nAltura * 8 + (0.03 * 8)) * 100;
    } else {
      areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
      perimetro = (nComprimento * 12 + nLargura * 12 + nAltura * 16) * 100;
    }
  }

  const tempCorteSegundos = perimetro / configMat.speed;
  const minutosTotaisExatos = tempCorteSegundos / 60;
  const valorCorte = minutosTotaisExatos * 3;

  const minutosCorte = Math.floor(tempCorteSegundos / 60);
  const segundosCorte = Math.round(tempCorteSegundos % 60);

  const valorMetroBase = dados.modoCalculo === 'corte' ? configMat.valorMetroQuadrado : espessuraCalculoCaixa;
  const valorMaterialBasePuro = (areaChapa * valorMetroBase * corPorcento + valorCorte);

  const areaPers = (Number(dados.larguraPers) / 100) * (Number(dados.alturaPers) / 100);
  const configPers = PERSONALIZACAO_CONFIG[dados.tipoPers] || { valor: 0, label: '' };
  const valorPersBasePuro = areaPers * configPers.valor;

  const valorBaseUnitario = valorMaterialBasePuro + valorPersBasePuro;
  const valorMaterialComTaxa = valorMaterialBasePuro * fatorAcrescimo;
  const valorPersComTaxa = valorPersBasePuro * fatorAcrescimo;
  const valorUnitarioFinal = valorBaseUnitario * fatorAcrescimo;
  const valorTotalItem = valorUnitarioFinal * dados.quantidade;

  const labelMaterial = dados.tipoMaterial === 'Acrílico' ? `Acrílico ${dados.corChapa.toUpperCase()} ${dados.espessuraChapa}mm` : MATERIAIS_CONFIG[dados.tipoMaterial]?.label || dados.tipoMaterial;
  let txtItem = dados.modoCalculo === 'corte' ? `- ${dados.quantidade}x ${labelMaterial} (${dados.comprimentoChapa}x${dados.larguraChapa}cm)` : `- ${dados.quantidade}x Caixa em ${labelMaterial}, medindo ${dados.comprimentoChapa}x${dados.profundidadeCaixa}x${dados.larguraChapa}cm [${dados.tipoTampa}]`;
  if (dados.tipoPers !== 'nenhum') txtItem += ` com Personalização em ${configPers.label} (${dados.larguraPers}x${dados.alturaPers}cm)`;

  const detalhePrecoDinamico = dados.quantidade === 1
    ? `Valor: R$ ${valorUnitarioFinal.toFixed(2)}`
    : `Unitário: R$ ${valorUnitarioFinal.toFixed(2)} | Total: R$ ${valorTotalItem.toFixed(2)}`;

  txtItem += `\n  (${detalhePrecoDinamico})`;

  return {
    areaChapa,
    areaPers,
    valorBaseUnitario,
    valorMaterial: valorMaterialComTaxa,
    valorPers: valorPersComTaxa,
    valorTotalItem,
    minutosCorte,
    segundosCorte,
    porcentagemAcumulada,
    txtItem
  };
}