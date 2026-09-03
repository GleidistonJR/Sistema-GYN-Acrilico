'use server'

import { prisma } from '@/lib/prisma'; // Adapte a importação de acordo com a localização do seu cliente Prisma

// Interface para receber os dados do orçamento
export interface DadosCalculo {
  modoCalculo: 'chapa' | 'corte' | 'caixa' | string;
  tipoMaterial: string;        // Ex: "Acrílico", "MDF", etc.
  corChapa: string;             // Ex: "transparente", "colorido", "branco", etc.
  espessuraChapa: string;       // Ex: "2", "3", "10" (representando mm)
  comprimentoInp: string;       // em centímetros
  larguraInp: string;           // em centímetros (usado como Altura nos cortes/caixas)
  profundidadeInp: string;      // em centímetros (usado como Largura/Profundidade nas caixas)
  tipoTampaCaixaInp: 'semTampa' | 'tampaLacrada' | 'tampa3cm' | string;

  quantidade: number;

  temImposto: boolean;
  temMaoDeObra: boolean;
  temProjeto: boolean;
  temEspecial: boolean;
}

// Interface do retorno formatado
export interface ResultadoCalculo {
  areaChapa: number;
  areaPers: number;
  valorBaseUnitario: number;
  valorMaterial: number;
  valorTotalItem: number;
  minutosCorte: number;
  segundosCorte: number;
  porcentagemAcumulada: number;
  txtItem: string;
}

/**
 * Função assíncrona que realiza a busca de valores no Banco de Dados
 * e efetua o cálculo dinâmico do item de orçamento.
 */
export async function calcularOrcamentoItem(dados: DadosCalculo) {
  // 1. Cálculo do Checklist de Taxas Adicionais
  let porcentagemAcumulada = 0;
  if (dados.temImposto) porcentagemAcumulada += 15;
  if (dados.temMaoDeObra) porcentagemAcumulada += 30;
  if (dados.temProjeto) porcentagemAcumulada += 35;
  if (dados.temEspecial) porcentagemAcumulada += 35;

  const porcentagensChecklist = (porcentagemAcumulada / 100) + 1;

  // 2. Busca do Material no Banco de Dados (Prisma)
  // Montamos o filtro dinamicamente de acordo com o tipo do material
  const whereCondition: any = {};

  if (dados.tipoMaterial === 'Acrílico') {
    if (dados.espessuraChapa) {
      whereCondition.espessura = dados.espessuraChapa;

    }

    if (dados.corChapa) {
      whereCondition.cor = {
        equals: dados.corChapa,
        mode: 'insensitive' // Garante busca sem diferenciar maiúsculas/minúsculas
      };
    }
  } else {
    // Acesse o filtro pelo campo 'nome' dentro da relação 'categoria'
    whereCondition.categoria = {
      nome: {
        contains: dados.tipoMaterial,
        mode: 'insensitive'
      }
    };
  }

  // Realiza a consulta no banco de dados
  const materialBanco = await prisma.material.findFirst({
    where: whereCondition,
    include:{
      categoria: true,
    }
  });

  // Custo base vindo do banco de dados (se não encontrar, assume 0)
  const custoBanco = materialBanco?.custo ?? 0;


  // ==========================================
  // MODALIDADE 1: CHAPA INTEIRA
  // ==========================================
  if (dados.modoCalculo === 'chapa') {
    // Se a cor for colorida e o valor do banco não estiver customizado, aplica acréscimo de 20%
    const acrescimoSeColorido = (dados.tipoMaterial === 'Acrílico' && dados.corChapa?.toLowerCase() === 'colorido') ? 1.2 : 1.0;

    const valorBaseUnitario = custoBanco * acrescimoSeColorido;
    const valorUnitarioFinal = valorBaseUnitario * porcentagensChecklist;
    const valorTotalItem = valorUnitarioFinal * dados.quantidade;

    const labelChapa = materialBanco?.nome || `${dados.tipoMaterial} ${dados.espessuraChapa}mm`;
    const detalhePreco = dados.quantidade === 1
      ? `Valor: R$ ${valorUnitarioFinal.toFixed(2)}`
      : `Unitário: R$ ${valorUnitarioFinal.toFixed(2)} | Total: R$ ${valorTotalItem.toFixed(2)}`;

    const txtItem = `- ${dados.quantidade}x Chapa Inteira ${labelChapa} ${dados.tipoMaterial === 'Acrílico' ? dados.corChapa.toUpperCase() : ''}\n  (${detalhePreco})`;

    return {
      areaChapa: 0,
      areaPers: 0,
      valorBaseUnitario,
      valorMaterial: valorUnitarioFinal,
      valorTotalItem,
      minutosCorte: 0,
      segundosCorte: 0,
      porcentagemAcumulada,
      txtItem
    };
  }


  // ==========================================
  // MODALIDADE 2 & 3: CORTES E CAIXAS
  // ==========================================
  const nComprimento = Number(dados.comprimentoInp) / 100; // Converte cm para metros
  const nAltura = Number(dados.larguraInp) / 100;          // Converte cm para metros
  const nLargura = Number(dados.profundidadeInp) / 100;     // Converte cm para metros

  // Definindo velocidade do laser (pode vir de um campo do banco ou mantida via fallback seguro)
  // Assumindo a velocidade padrão de corte do acrílico/MDF
  const velocidadeCorte = 1.5; // 15 milimetros por segundo

  let corPorcento = (dados.tipoMaterial === 'Acrílico' && dados.corChapa?.toLowerCase() === 'colorido') ? 1.2 : 1.0;
  let areaChapa = 0;
  let perimetro = 0;

  if (dados.modoCalculo === 'corte') {
    areaChapa = nComprimento * nAltura;
    perimetro = (nComprimento * 2 + nAltura * 2) * 100;
  } else {
    // Cálculo de área plana desdobrada e perímetro para Caixas 3D
    if (dados.tipoTampaCaixaInp === 'semTampa') {
      areaChapa = (nComprimento * nLargura * 1) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
      perimetro = (nComprimento * 6 + nLargura * 6 + nAltura * 8) * 100;
    } else if (dados.tipoTampaCaixaInp === 'tampaLacrada') {
      areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
      perimetro = (nComprimento * 8 + nLargura * 8 + nAltura * 8) * 100;
    } else if (dados.tipoTampaCaixaInp === 'tampa3cm' && nComprimento > 0) {
      areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2) + (nComprimento * 0.03 * 2) + (nLargura * 0.03 * 2);
      perimetro = (nComprimento * 12 + nLargura * 12 + nAltura * 8 + (0.03 * 8)) * 100;
    } else {
      areaChapa = (nComprimento * nLargura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2) + (nComprimento * nAltura * 2) + (nLargura * nAltura * 2);
      perimetro = (nComprimento * 12 + nLargura * 12 + nAltura * 16) * 100;
    }
  }

  // Cálculo do Tempo e Valor de Corte Laser (R$ 3,00 por minuto de máquina)
  const tempCorteSegundos = perimetro / velocidadeCorte;
  const minutosTotaisExatos = tempCorteSegundos / 60;
  const valorCorte = minutosTotaisExatos * 3;

  const minutosCorte = Math.floor(tempCorteSegundos / 60);
  const segundosCorte = Math.round(tempCorteSegundos % 60);

  // Valor por metro quadrado vem do banco de dados
  const valorMetroBase = custoBanco;
  const valorMaterialBasePuro = (areaChapa * valorMetroBase * corPorcento) + valorCorte;

  const valorBaseUnitario = valorMaterialBasePuro;
  const valorMaterialComTaxa = valorMaterialBasePuro * porcentagensChecklist;
  const valorUnitarioFinal = valorBaseUnitario * porcentagensChecklist;
  const valorTotalItem = valorUnitarioFinal * dados.quantidade;

  // Montagem da legenda do item
  const labelMaterial = materialBanco?.nome || (
    dados.tipoMaterial === 'Acrílico'
      ? `Acrílico ${dados.corChapa.toUpperCase()} ${dados.espessuraChapa}mm`
      : dados.tipoMaterial
  );

  let txtItem = dados.modoCalculo === 'corte'
    ? `- ${dados.quantidade}x ${labelMaterial} (${dados.comprimentoInp}x${dados.larguraInp}cm)`
    : `- ${dados.quantidade}x Caixa em ${labelMaterial}, medindo ${dados.comprimentoInp}x${dados.profundidadeInp}x${dados.larguraInp}cm [${dados.tipoTampaCaixaInp}]`;

  const detalhePrecoDinamico = dados.quantidade === 1
    ? `Valor: R$ ${valorUnitarioFinal.toFixed(2)}`
    : `Unitário: R$ ${valorUnitarioFinal.toFixed(2)} | Total: R$ ${valorTotalItem.toFixed(2)}`;

  txtItem += `\n  (${detalhePrecoDinamico})`;

  return {
    areaChapa,
    valorBaseUnitario,
    valorMaterial: valorMaterialComTaxa,
    valorTotalItem,
    minutosCorte,
    segundosCorte,
    porcentagemAcumulada,
    txtItem
  };
}