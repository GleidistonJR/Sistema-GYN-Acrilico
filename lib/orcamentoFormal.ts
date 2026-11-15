import type { ItemOrcamento } from '@/app/(sistema)/orcamentos/utils/constants';
import { nomeItem } from '@/app/(sistema)/orcamentos/utils/nomeItem';

export interface ItemFormal {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface FormularioOrcamento {
  referencia: string;
  emissao: string;
  validadeDias: number;
  vendedor: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteContato: string;
  empresaCnpj: string;
  empresaEndereco: string;
  empresaContato: string;
  pagamento: string;
  prazo: string;
  entrega: string;
  observacoes: string;
  desconto: number;
  frete: number;
  entradaPercentual: number;
}

export interface OrcamentoFormal extends FormularioOrcamento {
  itens: ItemFormal[];
}

export const EMPRESA_ORCAMENTO = {
    empresaCnpj: '23.650.001/0001-87',
    empresaEndereco: 'Rua C-162, nº 124, Qd. 252, Lt. 18 - Jardim América - Goiânia/GO - CEP 74255-110',
    empresaContato: 'Telefone / WhatsApp: 62 3945-0198',
} as const;

export function formularioInicial(): FormularioOrcamento {
  const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return {
    referencia: `ORC-${hoje.replaceAll('-', '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    emissao: hoje, validadeDias: 10, vendedor: '',
    clienteNome: 'Consumidor Final', clienteDocumento: '', clienteContato: '',
    ...EMPRESA_ORCAMENTO,
    pagamento: 'Entrada conforme valor indicado neste orçamento e saldo na retirada. Dinheiro, PIX, cartão de débito ou crédito em até 2x.',
    prazo: '7 dias úteis após aprovação do projeto e confirmação da entrada.',
    entrega: 'Retirada na loja. Não realizamos entrega.',
    observacoes: 'Produção iniciada após aprovação do projeto e confirmação do pagamento da entrada.',
    desconto: 0, frete: 0, entradaPercentual: 50,
  };
}

export function itensParaPdf(itens: ItemOrcamento[]): ItemFormal[] {
  return itens.map(item => ({
    descricao: nomeItem(item),
    quantidade: item.quantidade,
    valorUnitario: item.valorMaterial,
  }));
}

const centavos = (valor: number) => Math.round((valor + Number.EPSILON) * 100);

export function totaisOrcamento(itens: ItemFormal[], desconto = 0, frete = 0, entradaPercentual = 50) {
  const subtotal = itens.reduce((soma, item) => soma + Math.round(centavos(item.valorUnitario) * item.quantidade), 0);
  const total = subtotal - centavos(desconto) + centavos(frete);
  const entrada = Math.round(total * entradaPercentual / 100);
  return { subtotal: subtotal / 100, desconto, frete, total: total / 100, entrada: entrada / 100, saldo: (total - entrada) / 100 };
}

export function validarOrcamentoFormal(valor: unknown): OrcamentoFormal {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Dados do orçamento inválidos.');
  const dados = valor as Record<string, unknown>;
  const rotulos: Record<string, string> = {
    referencia: 'referência do orçamento', emissao: 'data de emissão', validade: 'validade', vendedor: 'vendedor',
    clienteNome: 'nome do cliente', clienteDocumento: 'CPF/CNPJ do cliente', clienteContato: 'contato do cliente',
    empresaCnpj: 'CNPJ da empresa', empresaEndereco: 'endereço da empresa', empresaContato: 'contato da empresa',
    pagamento: 'condições de pagamento', prazo: 'prazo de produção', entrega: 'retirada / entrega', observacoes: 'observações',
    desconto: 'desconto', frete: 'frete', entradaPercentual: 'percentual de entrada',
  };
  function texto(campo: string, maximo: number, obrigatorio = false) {
    const valor = dados[campo];
    if (typeof valor !== 'string' || valor.length > maximo || (obrigatorio && !valor.trim())) {
      throw new Error(`Preencha corretamente o campo ${rotulos[campo] ?? campo}.`);
    }
    return ['pagamento', 'prazo', 'entrega', 'observacoes'].includes(campo) ? valor.trim() : valor.trim().replace(/\s+/g, ' ');
  }
  function dinheiro(campo: string, maximo = 1_000_000_000) {
    const numero = dados[campo];
    if (typeof numero !== 'number' || !Number.isFinite(numero) || numero < 0 || numero > maximo) throw new Error(`Valor inválido em ${rotulos[campo] ?? campo}.`);
    return centavos(numero) / 100;
  }
  function data(campo: string) {
    const dia = texto(campo, 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !Number.isFinite(Date.parse(`${dia}T12:00:00Z`)) || new Date(`${dia}T12:00:00Z`).toISOString().slice(0, 10) !== dia) {
      throw new Error(`Data inválida em ${rotulos[campo] ?? campo}.`);
    }
    return dia;
  }
  const emissao = data('emissao');
  const validadeDias = dados.validadeDias;
  if (typeof validadeDias !== 'number' || !Number.isInteger(validadeDias) || validadeDias < 1 || validadeDias > 3650) throw new Error('Informe a validade em dias inteiros, entre 1 e 3650.');
  if (!Array.isArray(dados.itens) || dados.itens.length < 1 || dados.itens.length > 200) throw new Error('Adicione entre 1 e 200 itens ao orçamento.');
  const itens = dados.itens.map((item: unknown): ItemFormal => {
    if (!item || typeof item !== 'object') throw new Error('Item inválido.');
    const i = item as Record<string, unknown>;
    if (typeof i.descricao !== 'string' || !i.descricao.trim() || i.descricao.length > 1000) throw new Error('Confira a descrição dos itens (máximo de 1000 caracteres).');
    if (typeof i.quantidade !== 'number' || !Number.isFinite(i.quantidade) || i.quantidade <= 0 || i.quantidade > 1_000_000) throw new Error('Quantidade inválida nos itens.');
    if (typeof i.valorUnitario !== 'number' || !Number.isFinite(i.valorUnitario) || i.valorUnitario < 0 || i.valorUnitario > 1_000_000_000) throw new Error('Preço unitário inválido.');
    return { descricao: i.descricao.trim().replace(/\s+/g, ' '), quantidade: i.quantidade, valorUnitario: centavos(i.valorUnitario) / 100 };
  });
  const desconto = dinheiro('desconto'), frete = dinheiro('frete'), entradaPercentual = dinheiro('entradaPercentual', 100);
  const totais = totaisOrcamento(itens, desconto, frete, entradaPercentual);
  if (!Number.isSafeInteger(centavos(totais.subtotal)) || totais.subtotal > 1_000_000_000) throw new Error('O total excede o limite do orçamento.');
  if (desconto > totais.subtotal) throw new Error('O desconto não pode ser maior que o subtotal dos itens.');
  return {
    referencia: texto('referencia', 60, true), emissao, validadeDias, vendedor: texto('vendedor', 120, true),
    clienteNome: texto('clienteNome', 160, true), clienteDocumento: texto('clienteDocumento', 60), clienteContato: texto('clienteContato', 160),
    ...EMPRESA_ORCAMENTO,
    pagamento: texto('pagamento', 1200, true), prazo: texto('prazo', 800, true), entrega: texto('entrega', 800, true), observacoes: texto('observacoes', 2400),
    desconto, frete, entradaPercentual, itens,
  };
}
