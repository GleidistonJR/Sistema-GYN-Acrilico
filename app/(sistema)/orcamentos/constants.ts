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