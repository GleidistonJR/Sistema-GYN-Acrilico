import type { ItemOrcamento } from './constants';

export function nomeItem(item: ItemOrcamento): string {
  return item.tituloPersonalizado ?? item.descricaoTexto.split('\n')[0].replace(/^\s*-\s*\d+(?:[.,]\d+)?x\s*/, '');
}

export function renomearItem(item: ItemOrcamento, titulo: string): ItemOrcamento {
  const nome = titulo.trim().replace(/\s+/g, ' ');
  if (!nome || nome.length > 1000) throw new Error('Informe um nome entre 1 e 1000 caracteres.');
  const detalhes = item.descricaoTexto.indexOf('\n');
  return {
    ...item,
    tituloPersonalizado: nome,
    descricaoTexto: `- ${item.quantidade}x ${nome}${detalhes < 0 ? '' : item.descricaoTexto.slice(detalhes)}`,
  };
}
