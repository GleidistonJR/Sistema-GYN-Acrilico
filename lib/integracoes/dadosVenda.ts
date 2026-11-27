const moeda = (valor: unknown, permiteZero = false) => {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < (permiteZero ? 0 : 0.01) || valor > 10_000_000) {
    throw new Error('Confira os valores da venda.');
  }
  return Math.round(valor * 100);
};

export function validarVenda(input: unknown) {
  function objeto(valor: unknown) {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Dados da venda inválidos.');
    return valor as Record<string, unknown>;
  }
  function texto(valor: unknown, limite: number, rotulo: string) {
    if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > limite) throw new Error('Confira ' + rotulo + '.');
    return valor.trim();
  }
  const dados = objeto(input);
  const id = texto(dados.id, 36, 'a referência da venda');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) throw new Error('Referência de venda inválida.');
  const nome = texto(dados.nome, 120, 'o nome do cliente');
  const contatoId = dados.contatoId;
  const usarLojaOficial = dados.usarLojaOficial === true;
  if (contatoId !== undefined && (typeof contatoId !== 'number' || !Number.isSafeInteger(contatoId) || contatoId < 1)) {
    throw new Error('Selecione um cliente válido do Bling.');
  }
  const documento = typeof dados.documento === 'string' ? dados.documento.replace(/[./\s-]/g, '').toUpperCase() : '';
  if (usarLojaOficial && contatoId) throw new Error('Selecione apenas um cadastro para o pedido.');
  if (!usarLojaOficial && (!contatoId || documento) && !/^(?:\d{11}|[A-Z0-9]{12}\d{2})$/.test(documento)) throw new Error('Informe um CPF ou CNPJ válido.');
  const telefone = typeof dados.telefone === 'string' && /^[+\d\s().-]*$/.test(dados.telefone)
    ? dados.telefone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '') : '';
  if (!/^[1-9]\d{9,10}$/.test(telefone)) throw new Error('Informe um telefone com DDD.');
  if (!Array.isArray(dados.itens) || !dados.itens.length || dados.itens.length > 50) throw new Error('Inclua de 1 a 50 itens.');
  const itens = dados.itens.map(valor => {
    const item = objeto(valor);
    if (typeof item.quantidade !== 'number' || !Number.isSafeInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 100_000) {
      throw new Error('Confira as quantidades dos itens.');
    }
    if (typeof item.descricao !== 'string' || !item.descricao.trim() || item.descricao.length > 2000) throw new Error('Confira a descrição do item.');
    return {
      sku: texto(item.sku, 60, 'o código do material no Bling'),
      descricao: item.descricao,
      quantidade: item.quantidade,
      centavos: moeda(item.valorUnitario, true),
    };
  });
  const total = itens.reduce((soma, item) => soma + item.quantidade * item.centavos, 0);
  if (!Array.isArray(dados.parcelas) || !dados.parcelas.length || dados.parcelas.length > 12) throw new Error('Inclua de 1 a 12 pagamentos.');
  const parcelas = dados.parcelas.map(valor => {
    const parcela = objeto(valor);
    const vencimento = texto(parcela.vencimento, 10, 'a data de vencimento');
    const data = new Date(vencimento + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento) || !Number.isFinite(+data) || data.toISOString().slice(0, 10) !== vencimento) {
      throw new Error('Confira a data de vencimento das parcelas.');
    }
    const forma = parcela.forma;
    if (typeof forma !== 'number' || !Number.isSafeInteger(forma) || forma <= 0) throw new Error('Escolha a forma de pagamento do Bling.');
    return { vencimento, forma, centavos: moeda(parcela.valor) };
  });
  if (parcelas.reduce((soma, parcela) => soma + parcela.centavos, 0) !== total) {
    throw new Error('A soma dos pagamentos deve ser igual ao total da venda.');
  }
  return { id, nome, documento: usarLojaOficial ? '' : documento, telefone, itens, parcelas,
    ...(contatoId ? { contatoId } : {}), ...(usarLojaOficial ? { usarLojaOficial } : {}) };
}

export type DadosVenda = ReturnType<typeof validarVenda>;
