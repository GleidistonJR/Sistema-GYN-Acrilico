'use server'

import { prisma } from '@/lib/prisma'; // Adapte conforme a localização do seu cliente Prisma
import type { Prisma } from '@prisma/client';
import { formatarMoeda } from './formatarMoeda';

// ===========================================================================
// Tipos
// ===========================================================================

export interface DadosCalculo {
  modoCalculo: 'chapa' | 'corte' | 'caixa' | 'perso' | 'personalizacao' | string;
  tipoMaterial: string;        // Ex: "Acrílico", "PVC", "ACM"...
  corChapa: string;            // Ex: "Cristal", "Branco"...
  espessuraChapa: string;      // Ex: "2", "3", "10" (mm)
  comprimentoInp: string;      // cm
  larguraInp: string;          // cm (usado como altura em cortes/caixas)
  profundidadeInp: string;     // cm (usado só em caixas)
  tipoTampaCaixaInp: 'semTampa' | 'tampaLacrada' | 'tampa3cm' | string;

  quantidade: number;

  // Id do material escolhido diretamente (ex.: itens de "Personalização")
  materialId?: string;

  temImposto: boolean;
  temMaoDeObra: boolean;
  temProjeto: boolean;
  temEspecial: boolean;
}

export interface ResultadoCalculo {
  areaChapa: number;
  valorBaseUnitario: number;
  valorMaterial: number;
  valorTotalItem: number;
  minutosCorte: number;
  segundosCorte: number;
  porcentagemAcumulada: number;
  txtItem: string;
}

type MaterialComCategoria = Prisma.MaterialGetPayload<{ include: { categoria: true } }>;

interface Taxas {
  porcentagemAcumulada: number;
  fator: number; // ex.: 30% → 1.3
}

interface EntradaResultado {
  descricao: string;            // primeira linha do texto do item
  valorBaseUnitario: number;    // antes das taxas adicionais
  areaChapa?: number;
  minutosCorte?: number;
  segundosCorte?: number;
}

// ===========================================================================
// Constantes de negócio
// ===========================================================================

const CATEGORIA_PERSONALIZACAO = 'Personalização';
const CUSTO_LASER_POR_MINUTO = 3;        // R$ por minuto de máquina
const VELOCIDADE_CORTE_PADRAO = 2;       // cm/s, quando o material não tem velocidade cadastrada

const TAXAS_ADICIONAIS = [
  { campo: 'temImposto', percentual: 15 },
  { campo: 'temMaoDeObra', percentual: 30 },
  { campo: 'temProjeto', percentual: 35 },
  { campo: 'temEspecial', percentual: 35 },
] as const;

// ===========================================================================
// Helpers gerais
// ===========================================================================

const arredondar = (n: number) => Number(n.toFixed(2));

function calcularTaxas(dados: DadosCalculo): Taxas {
  const porcentagemAcumulada = TAXAS_ADICIONAIS.reduce(
    (total, { campo, percentual }) => (dados[campo] ? total + percentual : total),
    0
  );
  return { porcentagemAcumulada, fator: porcentagemAcumulada / 100 + 1 };
}

function rotuloMaterial(material: MaterialComCategoria | null, dados: DadosCalculo): string {
  if (material?.nome) return material.nome;
  return dados.tipoMaterial != 'personalizacao'
    ? `${dados.tipoMaterial} ${dados.corChapa} ${dados.espessuraChapa}mm`
    : dados.tipoMaterial;
}

/** Aplica as taxas, calcula o total e monta o texto do item. */
function montarResultado(
  entrada: EntradaResultado,
  dados: DadosCalculo,
  taxas: Taxas
): ResultadoCalculo {
  const valorBaseUnitario = arredondar(entrada.valorBaseUnitario);
  const valorUnitarioFinal = arredondar(valorBaseUnitario * taxas.fator);
  const valorTotalItem = arredondar(valorUnitarioFinal * dados.quantidade);

  const detalhePreco =
    dados.quantidade === 1
      ? `Valor: R$ ${formatarMoeda(valorUnitarioFinal)}`
      : `Unitário: R$ ${formatarMoeda(valorUnitarioFinal)} | Total: R$ ${formatarMoeda(valorTotalItem)}`;

  return {
    areaChapa: entrada.areaChapa ?? 0,
    valorBaseUnitario,
    valorMaterial: valorUnitarioFinal,
    valorTotalItem,
    minutosCorte: entrada.minutosCorte ?? 0,
    segundosCorte: entrada.segundosCorte ?? 0,
    porcentagemAcumulada: taxas.porcentagemAcumulada,
    txtItem: `${entrada.descricao}\n  (${detalhePreco})`,
  };
}

// ===========================================================================
// Busca do material
// ===========================================================================

async function buscarMaterial(
  dados: DadosCalculo,
  ehPerso: boolean
): Promise<MaterialComCategoria | null> {
  // Material escolhido diretamente (ex.: item de personalização)
  if (dados.materialId) {
    return prisma.material.findUnique({
      where: { id: dados.materialId },
      include: { categoria: true },
    });
  }

  // Personalização só é calculada a partir de um item escolhido (materialId)
  if (ehPerso || dados.tipoMaterial === CATEGORIA_PERSONALIZACAO) return null;

  const where: Prisma.MaterialWhereInput = {};

  if (dados.tipoMaterial) {
    where.categoria = { nome: dados.tipoMaterial };
  }
  if (dados.espessuraChapa) {
    where.espessura = dados.espessuraChapa;
  }
  if (dados.corChapa) {
    where.cor = { equals: dados.corChapa, mode: 'insensitive' };
  }

  return prisma.material.findFirst({
    where,
    include: { categoria: true },
  });
}

// ===========================================================================
// Geometria (medidas em metros; perímetro devolvido em cm)
// ===========================================================================

function geometriaCorte(c: number, l: number) {
  return {
    area: c * l,
    perimetroCm: (c * 2 + l * 2) * 100,
  };
}

function geometriaCaixa(c: number, l: number, p: number, tampa: string) {
  switch (tampa) {
    case 'semTampa':
      return {
        area: c * p + c * l * 2 + p * l * 2,
        perimetroCm: (c * 6 + p * 6 + l * 8) * 100,
      };

    case 'tampaLacrada':
      return {
        area: c * p * 2 + c * l * 2 + p * l * 2,
        perimetroCm: (c * 8 + p * 8 + l * 8) * 100,
      };

    case 'tampa3cm':
      return {
        area: c * p * 2 + c * l * 2 + p * l * 2 + c * 0.03 * 2 + p * 0.03 * 2,
        perimetroCm: (c * 12 + p * 12 + l * 8 + 0.03 * 8) * 100,
      };

    default: // 'tampaTotal' (encaixe com a medida total)
      return {
        area: c * p * 2 + c * l * 2 + p * l * 2 + c * l * 2 + p * l * 2,
        perimetroCm: (c * 12 + p * 12 + l * 16) * 100,
      };
  }
}

// ===========================================================================
// Modalidades de cálculo
// ===========================================================================

function calcularChapa(
  dados: DadosCalculo,
  material: MaterialComCategoria | null,
  taxas: Taxas
): ResultadoCalculo {
  const label = material?.nome || `${dados.tipoMaterial} ${dados.espessuraChapa}mm`;
  const cor = dados.tipoMaterial === 'Acrílico' ? dados.corChapa.toUpperCase() : '';
  const descricao = `- ${dados.quantidade}x Chapa Inteira ${[label, cor].filter(Boolean).join(' ')}`;

  return montarResultado(
    { descricao, valorBaseUnitario: material?.valorVendaInteiro ?? 0 },
    dados,
    taxas
  );
}

function calcularCorteOuCaixa(
  dados: DadosCalculo,
  material: MaterialComCategoria | null,
  taxas: Taxas
): ResultadoCalculo {
  const c = Number(dados.comprimentoInp) / 100; // cm → m
  const l = Number(dados.larguraInp) / 100;
  const p = Number(dados.profundidadeInp) / 100;

  const { area, perimetroCm } =
    dados.modoCalculo === 'corte'
      ? geometriaCorte(c, l)
      : geometriaCaixa(c, l, p, dados.tipoTampaCaixaInp);

  // velocidadeCorte vem em mm/s e o perímetro está em cm → divide por 10 para cm/s
  const velocidadeCmPorSeg = material?.velocidadeCorte
    ? material.velocidadeCorte / 10
    : VELOCIDADE_CORTE_PADRAO;

  const segundosExatos = perimetroCm / velocidadeCmPorSeg;
  const valorCorte = (segundosExatos / 60) * CUSTO_LASER_POR_MINUTO;

  // Arredonda os segundos totais antes de separar, para nunca exibir "60 s"
  const segundosTotais = Math.round(segundosExatos);
  const minutosCorte = Math.floor(segundosTotais / 60);
  const segundosCorte = segundosTotais % 60;

  const valorMetroQuadrado = material?.ValorVendaFracionado ?? 0;
  const valorBaseUnitario = area * valorMetroQuadrado + valorCorte;

  const label = rotuloMaterial(material, dados);
  const descricao =
    dados.modoCalculo === 'corte'
      ? `- ${dados.quantidade}x ${label} (${dados.comprimentoInp}x${dados.larguraInp}cm)`
      : `- ${dados.quantidade}x Caixa em ${label}, medindo ${dados.comprimentoInp}x${dados.profundidadeInp}x${dados.larguraInp}cm [${dados.tipoTampaCaixaInp}]`;

  return montarResultado(
    { descricao, valorBaseUnitario, areaChapa: area, minutosCorte, segundosCorte },
    dados,
    taxas
  );
}

function calcularPersonalizacao(
  dados: DadosCalculo,
  material: MaterialComCategoria | null,
  taxas: Taxas
): ResultadoCalculo {
  if (!material) {
    throw new Error('Selecione o tipo de personalização.');
  }

  // Sem tempo de corte nem espessura: só valor do M² × m² usado
  const area = (Number(dados.comprimentoInp) / 100) * (Number(dados.larguraInp) / 100);
  const valorMetroQuadrado = material.ValorVendaFracionado ?? 0;

  const descricao =
    `- ${dados.quantidade}x ${material.nome ?? 'Personalização'} ` +
    `(${dados.comprimentoInp}x${dados.larguraInp}cm)`;

  return montarResultado(
    { descricao, valorBaseUnitario: area * valorMetroQuadrado, areaChapa: area },
    dados,
    taxas
  );
}

// ===========================================================================
// Função principal
// ===========================================================================

/**
 * Busca o material no banco e calcula o item do orçamento
 * de acordo com a modalidade (chapa, corte, caixa ou personalização).
 */
export async function calcularOrcamentoItem(dados: DadosCalculo): Promise<ResultadoCalculo> {
  const taxas = calcularTaxas(dados);

  // O formulário envia 'perso'; aceita 'personalizacao' por compatibilidade
  const modo = dados.modoCalculo === 'personalizacao' ? 'perso' : dados.modoCalculo;

  const material = await buscarMaterial(dados, modo === 'perso');

  switch (modo) {
    case 'chapa':
      return calcularChapa(dados, material, taxas);

    case 'corte':
    case 'caixa':
      return calcularCorteOuCaixa(dados, material, taxas);

    case 'perso':
      return calcularPersonalizacao(dados, material, taxas);

    default:
      throw new Error(`Modo de cálculo inválido: ${dados.modoCalculo}`);
  }
}