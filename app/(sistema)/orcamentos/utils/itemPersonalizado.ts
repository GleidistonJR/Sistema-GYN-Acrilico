import type { ItemOrcamento } from './constants';
import { formatarMoeda } from './formatarMoeda';

export function criarItemPersonalizado(titulo: string, valor: number, id: string, quantidade = 1): ItemOrcamento {
  const nome = titulo.trim().replace(/\s+/g, ' ');
  const centavos = Math.round(valor * 100);
  if (!nome) throw new Error('Informe o título do item.');
  if (!Number.isFinite(valor) || valor <= 0 || !Number.isSafeInteger(centavos) || centavos < 1) {
    throw new Error('Informe um valor maior que zero.');
  }
  const preco = centavos / 100;
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || !Number.isSafeInteger(centavos * quantidade)) {
    throw new Error('Informe uma quantidade inteira maior que zero.');
  }
  const total = centavos * quantidade / 100;
  return {
    id, modoCalculo: 'custom', tituloPersonalizado: nome,
    tipoDeChapa: '', corChapa: '', espessuraChapa: '',
    larguraChapa: 0, alturaChapa: 0, profundidadeCaixa: 0, tipoTampa: '',
    quantidade, materialId: undefined, areaChapa: 0,
    valorBaseUnitario: preco, valorMaterial: preco, valorTotalItem: total,
    taxasAplicadas: { temImposto: false, temMaoDeObra: false, temProjeto: false, temEspecial: false, porcentagemTotal: 0 },
    descricaoTexto: `- ${quantidade}x ${nome}\n  (${quantidade === 1
      ? `Valor: R$ ${formatarMoeda(preco)}`
      : `Unitário: R$ ${formatarMoeda(preco)} | Total: R$ ${formatarMoeda(total)}`})`,
  };
}
