export interface MaterialConfig {
  label: string;
  valorMetroQuadrado: number;
  speed: number;
}

export const MATERIAIS_CONFIG: Record<string, MaterialConfig> = {
  "2": { label: "Acrílico 2mm", valorMetroQuadrado: 211, speed: 2.2 },
  "3": { label: "Acrílico 3mm", valorMetroQuadrado: 311.47, speed: 1.8 },
  "4": { label: "Acrílico 4mm", valorMetroQuadrado: 414.84, speed: 1.5 },
  "5": { label: "Acrílico 5mm", valorMetroQuadrado: 518.56, speed: 1.2 },
  "6": { label: "Acrílico 6mm", valorMetroQuadrado: 622.28, speed: 0.8 },
  "8": { label: "Acrílico 8mm", valorMetroQuadrado: 829.70, speed: 0.6 },
  "10": { label: "Acrílico 10mm", valorMetroQuadrado: 1037.12, speed: 0.3 },
  "12": { label: "Acrílico 12mm", valorMetroQuadrado: 1360.98, speed: 0.2 },
  "15": { label: "Acrílico 15mm", valorMetroQuadrado: 1701.23, speed: 0.1 },
  "20": { label: "Acrílico 20mm", valorMetroQuadrado: 2401.73, speed: 0.1 },
  "pvc": { label: "PVC", valorMetroQuadrado: 160, speed: 2.2 },
  "abs": { label: "ABS - Trotek", valorMetroQuadrado: 800, speed: 2.2 },
  "espelhado": { label: "Espelhado", valorMetroQuadrado: 400, speed: 2.2 },
};

export const PERSONALIZACAO_CONFIG: Record<string, { label: string; valor: number }> = {
  "nenhum": { label: "Nenhuma", valor: 0 },
  "impresso": { label: "Adesivo Impresso", valor: 180 },
  "espelhado": { label: "Adesivo Impresso Espelhado", valor: 230 },
  "fiber": { label: "Gravação na Fiber", valor: 400 },
  "co2": { label: "Gravação a Laser Co2", valor: 1000 },
  "uv": { label: "Impressão UV (Alta definição)", valor: 1000 },
  "abs": { label: "Trotek (ABS)", valor: 800 },
  "acrilicoEspelhado": { label: "Acrílico Espelhado", valor: 400 },
};

export const CHAPA_CONFIG: Record<string, { label: string; valor: number }> = {
  "2": { label: "Chapa de Acrilico 2mm, (2x1)Metros", valor: 363 },
  "3": { label: "Chapa de Acrilico 3mm, (2x1)Metros", valor: 537 },
  "4": { label: "Chapa de Acrilico 4mm, (2x1)Metros", valor: 715 },
  "5": { label: "Chapa de Acrilico 5mm, (2x1)Metros", valor: 894 },
  "6": { label: "Chapa de Acrilico 6mm, (2x1)Metros", valor: 1072 },
  "8": { label: "Chapa de Acrilico 8mm, (2x1)Metros", valor: 1430 },
  "10": { label: "Chapa de Acrilico 10mm, (2x1)Metros", valor: 1788 },
  "12": { label: "Chapa de Acrilico 12mm, (2x1)Metros", valor: 2234 },
  "15": { label: "Chapa de Acrilico 15mm, (2x1)Metros", valor: 2933 },
  "20": { label: "Chapa de Acrilico 20mm, (2x1)Metros", valor: 4140 },
  "pvc": { label: "Chapa PVC, (2,4x1,2)Metros", valor: 216 },
  "abs": { label: "Chapa ABS-Trotek, (1x0,6)Metros", valor: 650 },
  "espelhado": { label: "Chapa de Acrilico espelhado, (2x1)Metros", valor: 423 },
  "psai": { label: "Chapa de PSAI, (2x1)Metros", valor: 90 },
};

export const TAXAS_ORCAMENTO = {
  IMPOSTO: 15,     // 15%
  MAO_DE_OBRA: 30, // %
  PROJETO: 30,     // %
  ESPECIAL: 35,    // %
};

// Definição de um item do orçamento
export interface ItemOrcamento {
  id: string;
  tipoMaterial: string;
  corChapa: string;
  espessuraChapa: string;
  larguraChapa: number;
  alturaChapa: number;
  tipoPers: string;
  larguraPers: number;
  alturaPers: number;
  quantidade: number;
  // Valores calculados para histórico do item
  areaChapa: number;
  areaPers: number;
  valorMaterial: number;
  valorPers: number;
  valorTotalItem: number;
  descricaoTexto: string;
}