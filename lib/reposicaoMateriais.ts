interface MaterialReposicao {
  nome: string | null;
  cor: string | null;
  espessura: string | null;
  estoque: number;
  estoquePadrao?: number;
  categoria: { nome: string };
}

export function calcularReposicao(estoque: number, estoquePadrao = 0) {
  if (!Number.isFinite(estoque) || !Number.isFinite(estoquePadrao) || estoquePadrao <= 0) return 0;
  // Sheets are purchased as whole units, even when remaining stock is fractional.
  return Math.max(0, Math.ceil(estoquePadrao - estoque));
}

export function montarListaReposicao(materiais: MaterialReposicao[]) {
  return materiais
    .map(material => ({
      nome: [material.categoria.nome, material.nome, material.cor,
        material.espessura ? `${material.espessura}mm` : null].filter(Boolean).join(' '),
      quantidade: calcularReposicao(material.estoque, material.estoquePadrao),
    }))
    .filter(item => item.quantidade > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true }))
    .map(item => `${item.nome}: ${String(item.quantidade).padStart(2, '0')} UND`)
    .join('\n');
}

export function montarListaReposicaoProdutos(produtos: { nome: string; estoque: number; estoquePadrao?: number }[]) {
  return produtos
    .map(produto => ({ nome: produto.nome, quantidade: calcularReposicao(produto.estoque, produto.estoquePadrao) }))
    .filter(item => item.quantidade > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true }))
    .map(item => `${item.nome}: ${String(item.quantidade).padStart(2, '0')} UND`)
    .join('\n');
}
