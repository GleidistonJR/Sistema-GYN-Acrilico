export type TipoTampa = 'semTampa' | 'tampaLacrada' | 'tampa3cm' | 'tampaTotal';

export const NOMES_TAMPAS: Record<TipoTampa, string> = {
  semTampa: 'Sem tampa',
  tampaLacrada: 'Tampa lacrada',
  tampa3cm: 'Tampa encaixe (abas 3cm)',
  tampaTotal: 'Tampa encaixe (medida total)',
};

/** Sum the material and the cutting perimeter of each rectangular panel. */
export function geometriaCaixa({ comprimentoCm, larguraCm, alturaCm, tampa }: {
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
  tampa: string;
}) {
  if (![comprimentoCm, larguraCm, alturaCm].every(n => Number.isFinite(n) && n > 0)) {
    throw new Error('Informe comprimento, largura e altura maiores que zero.');
  }
  if (!Object.hasOwn(NOMES_TAMPAS, tampa)) throw new Error('Tipo de tampa inválido.');
  const comprimento = comprimentoCm / 100;
  const largura = larguraCm / 100;
  const altura = alturaCm / 100;
  const pecas = [
    { quantidade: 1, a: comprimento, b: largura }, // Fundo
    { quantidade: 2, a: comprimento, b: altura }, // Frente e trás
    { quantidade: 2, a: largura, b: altura }, // Laterais
  ];
  if (tampa !== 'semTampa') pecas.push({ quantidade: 1, a: comprimento, b: largura });
  if (tampa === 'tampa3cm' || tampa === 'tampaTotal') {
    const aba = tampa === 'tampa3cm' ? 0.03 : altura;
    pecas.push({ quantidade: 2, a: comprimento, b: aba }, { quantidade: 2, a: largura, b: aba });
  }
  return {
    area: pecas.reduce((soma, peca) => soma + peca.quantidade * peca.a * peca.b, 0),
    perimetroCm: pecas.reduce((soma, peca) => soma + peca.quantidade * 2 * (peca.a + peca.b) * 100, 0),
  };
}
