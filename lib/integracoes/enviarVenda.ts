import 'server-only';
import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { bling, configuracaoBling, criptografar, descriptografar, ErroPlataforma, formasPagamento, tokenBling } from './bling';
import { configuracaoTrello, criarCartao, procurarCartao, urlCartao } from './trello';
import type { DadosVenda } from './dadosVenda';

type ProdutoBling = { id: number; nome: string; codigo: string; unidade?: string };
type Pedido = { id: number; numero: number; numeroLoja?: string; itens?: { codigo: string; descricao: string }[] };
type Contato = { id: number; numeroDocumento: string; situacao: string };

const recusado = (erro: unknown) => erro instanceof ErroPlataforma &&
  [400, 401, 403, 404, 422, 429].includes(erro.status);
const idValido = (valor: number) => Number.isSafeInteger(valor) && valor > 0;

export async function retomarVenda(id: string, usuarioId: string) {
  const envio = await prisma.envioVenda.findFirst({ where: { id, usuarioId } });
  if (!envio) return { status: 404, erro: 'Envio não encontrado.' };
  if (envio.etapa === 'CONCLUIDO') return { status: 200, numero: envio.blingNumero?.toString(), trelloUrl: envio.trelloUrl };
  if (!envio.carga) return { status: 409, erro: 'A tentativa foi recusada. Revise os dados e prepare outra venda.' };
  return enviarVenda(descriptografar<DadosVenda>(envio.carga), usuarioId);
}

export async function enviarVenda(venda: DadosVenda, usuarioId: string) {
  const config = configuracaoBling();
  const trello = configuracaoTrello();
  if (!config || !trello) return { status: 503, erro: 'Peça a um administrador para configurar Bling e Trello.' };

  const referencia = 'GYN-' + venda.id;
  const marcador = 'Referência GYN ' + referencia;
  const verificacao = createHmac('sha256', config.chave).update(JSON.stringify(venda)).digest('hex');
  const envio = await prisma.envioVenda.upsert({
    where: { id: venda.id },
    create: { id: venda.id, usuarioId, verificacao, carga: criptografar(venda) },
    update: {},
  });
  if (envio.usuarioId !== usuarioId) return { status: 404, erro: 'Envio não encontrado.' };
  if (envio.verificacao !== verificacao) return { status: 409, erro: 'Os dados desta tentativa precisam permanecer iguais durante a recuperação.' };
  if (envio.etapa === 'CONCLUIDO') return { status: 200, numero: envio.blingNumero?.toString(), trelloUrl: envio.trelloUrl };

  const agora = new Date();
  const bloqueadoAte = new Date(+agora + 240_000);
  const { count } = await prisma.envioVenda.updateMany({
    where: { id: venda.id, etapa: envio.etapa, OR: [{ bloqueadoAte: null }, { bloqueadoAte: { lt: agora } }] },
    data: { bloqueadoAte, carga: envio.carga || criptografar(venda) },
  });
  if (!count) return { status: 409, erro: 'Aguarde a tentativa em andamento e consulte novamente.' };

  const alterar = (data: { etapa: string; blingId?: bigint; blingNumero?: bigint; trelloUrl?: string; carga?: null }) =>
    prisma.envioVenda.update({ where: { id: venda.id }, data });

  let etapa = envio.etapa;
  let numero = envio.blingNumero;
  let blingId = envio.blingId;
  const telefone = venda.telefone ? `(${venda.telefone.slice(0, 2)}) ${venda.telefone.slice(2, -4)}-${venda.telefone.slice(-4)}` : '';
  const descricaoCartao = (nomeMaterial: (sku: string) => string) =>
    [`Cliente: ${venda.nome}`, ...(telefone ? [`Contato: ${telefone}`] : []), '', 'Materiais e especificações:',
      ...venda.itens.map(item => `- ${item.quantidade} × ${nomeMaterial(item.sku)} — ${item.descricao}`), '', marcador].join('\n');
  try {
    if (etapa === 'TRELLO_INCERTO' && numero) {
      const cartao = await procurarCartao(trello, marcador);
      if (!cartao) throw new Error('Confira no Trello se o cartão foi criado. A tentativa anterior ainda não teve confirmação.');
      const trelloUrl = urlCartao(cartao.shortUrl);
      await alterar({ etapa: 'CONCLUIDO', trelloUrl, carga: null });
      return { status: 200, numero: numero.toString(), trelloUrl };
    }
    const token = await tokenBling();
    const skus = [...new Set(venda.itens.map(item => item.sku))];
    let catalogoCarregado: Map<string, ProdutoBling> | undefined;
    const produtos = async () => {
      if (catalogoCarregado) return catalogoCarregado;
      const query = new URLSearchParams({ criterio: '2', limite: '100' });
      for (const sku of skus) query.append('codigos[]', sku);
      const cadastro = await bling<ProdutoBling[]>(token, '/produtos?' + query);
      const encontrados = new Map(skus.map(sku => {
        const matches = cadastro.filter(produto => produto.codigo === sku && idValido(produto.id));
        if (matches.length !== 1) throw new Error('Confira o SKU ativo no Bling: ' + sku + '.');
        return [sku, matches[0]];
      }));
      catalogoCarregado = encontrados;
      return catalogoCarregado;
    };

    if (etapa === 'PENDENTE' || etapa === 'CONTATO_INCERTO') {
      const catalogo = await produtos();
      if (descricaoCartao(sku => catalogo.get(sku)!.nome).length > 15_000) {
        throw new Error('Reduza as descrições dos itens para que caibam no cartão do Trello.');
      }
      const formas = await formasPagamento(token);
      if (venda.parcelas.some(parcela => !formas.some(forma => forma.id === parcela.forma))) {
        throw new Error('Escolha apenas formas de recebimento ativas no Bling.');
      }
      const contatoId = venda.contatoId ? await (async () => {
        const contato = await bling<Contato>(token, '/contatos/' + venda.contatoId);
        if (contato.id !== venda.contatoId || !['A', 'S'].includes(contato.situacao) ||
            (contato.numeroDocumento ?? '').replace(/[./\s-]/g, '').toUpperCase() !== venda.documento) {
          throw new Error('Selecione o cliente novamente. O cadastro do Bling foi alterado.');
        }
        return contato.id;
      })() : await prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${venda.documento}, 70518))`;
        const contatos = await bling<Contato[]>(token, '/contatos?criterio=1&numeroDocumento=' + encodeURIComponent(venda.documento));
        const encontrados = contatos.filter(contato =>
          contato.numeroDocumento?.replace(/[./\s-]/g, '').toUpperCase() === venda.documento);
        if (encontrados.length > 1) throw new Error('Há mais de um contato com este CPF/CNPJ no Bling. Revise o cadastro antes de continuar.');
        if (encontrados.length === 1) {
          if (!['A', 'S'].includes(encontrados[0].situacao) || !idValido(encontrados[0].id)) throw new Error('Reative o cadastro do cliente no Bling antes de continuar.');
          return encontrados[0].id;
        }
        if (etapa === 'CONTATO_INCERTO') throw new Error('Confira no Bling se o contato foi criado. A tentativa anterior não teve confirmação.');
        // A reserva da tentativa precisa permanecer gravada mesmo se o Bling não responder.
        await alterar({ etapa: 'CONTATO_INCERTO' });
        etapa = 'CONTATO_INCERTO';
        try {
          const contato = await bling<{ id: number }>(token, '/contatos', {
            nome: venda.nome, numeroDocumento: venda.documento, tipo: venda.documento.length === 11 ? 'F' : 'J',
            situacao: 'A', [venda.telefone.length === 11 ? 'celular' : 'telefone']: venda.telefone,
          });
          if (!idValido(contato.id)) throw new Error('O Bling não confirmou o cadastro do contato.');
          return contato.id;
        } catch (erro) {
          if (recusado(erro)) {
            await alterar({ etapa: 'PENDENTE' });
            etapa = 'PENDENTE';
          }
          throw erro;
        }
      }, { timeout: 45000 });

      await alterar({ etapa: 'BLING_INCERTO' });
      etapa = 'BLING_INCERTO';
      let pedido: Pedido;
      try {
        pedido = await bling<Pedido>(token, '/pedidos/vendas', {
          numeroLoja: referencia,
          data: new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
          contato: { id: contatoId },
          itens: venda.itens.map(item => {
            const produto = catalogo.get(item.sku)!;
            return {
              produto: { id: produto.id }, codigo: produto.codigo, unidade: produto.unidade || 'UN',
              descricao: produto.nome, descricaoDetalhada: item.descricao,
              quantidade: item.quantidade, valor: item.centavos / 100,
            };
          }),
          parcelas: venda.parcelas.map(parcela => ({
            dataVencimento: parcela.vencimento, valor: parcela.centavos / 100, formaPagamento: { id: parcela.forma },
          })),
        });
      } catch (erro) {
        if (recusado(erro)) {
          await alterar({ etapa: 'PENDENTE' });
          etapa = 'PENDENTE';
        }
        throw erro;
      }
      if (!idValido(pedido.id)) throw new Error('O Bling ainda não confirmou o identificador do pedido.');
      blingId = BigInt(pedido.id);
      await alterar({ etapa: 'BLING_CRIADO', blingId });
      etapa = 'BLING_CRIADO';
      if (!idValido(pedido.numero)) pedido = await bling<Pedido>(token, '/pedidos/vendas/' + pedido.id);
      if (!idValido(pedido.numero)) throw new Error('O pedido foi criado. O número do Bling ainda não está disponível.');
      numero = BigInt(pedido.numero);
      await alterar({ etapa, blingNumero: numero });
    }

    if (etapa === 'BLING_INCERTO') {
      const query = new URLSearchParams({ 'numerosLojas[]': referencia });
      const pedidos = await bling<Pedido[]>(token, '/pedidos/vendas?' + query);
      const matches = pedidos.filter(pedido => pedido.numeroLoja === referencia);
      if (matches.length !== 1 || !idValido(matches[0].id) || !idValido(matches[0].numero)) {
        throw new Error('Confira no Bling se o pedido foi criado antes de enviar novamente. Ainda não houve confirmação.');
      }
      numero = BigInt(matches[0].numero);
      blingId = BigInt(matches[0].id);
      await alterar({ etapa: 'BLING_CRIADO', blingId, blingNumero: numero });
      etapa = 'BLING_CRIADO';
    }

    let detalhes: Pedido | undefined;
    if (blingId && (!numero || !catalogoCarregado)) {
      detalhes = await bling<Pedido>(token, '/pedidos/vendas/' + blingId);
    }
    if (!numero && detalhes) {
      const pedido = detalhes;
      if (!idValido(pedido.numero)) throw new Error('O número do pedido ainda não está disponível no Bling.');
      numero = BigInt(pedido.numero);
      await alterar({ etapa, blingNumero: numero });
    }

    if (!numero) throw new Error('A confirmação do número do Bling está pendente.');
    const nomesPedido = new Map(detalhes?.itens?.map(item => [item.codigo, item.descricao]));
    const nomeMaterial = (sku: string) => catalogoCarregado?.get(sku)?.nome || nomesPedido.get(sku) || sku;
    const materiais = [...new Set(venda.itens.map(item => nomeMaterial(item.sku)))];
    const titulo = `Pedido ${numero} - ${venda.nome} - ${materiais.join(', ')}`.slice(0, 250);
    const descricao = descricaoCartao(nomeMaterial);
    if (descricao.length > 15_000) throw new Error('A descrição dos itens ficou grande demais para o Trello.');
    await alterar({ etapa: 'TRELLO_INCERTO' });
    etapa = 'TRELLO_INCERTO';
    try {
      const cartao = await criarCartao(trello, titulo, descricao);
      const trelloUrl = urlCartao(cartao.shortUrl);
      await alterar({ etapa: 'CONCLUIDO', trelloUrl, carga: null });
      return { status: 200, numero: numero.toString(), trelloUrl };
    } catch (erro) {
      if (recusado(erro)) {
        await alterar({ etapa: 'BLING_CRIADO' });
        etapa = 'BLING_CRIADO';
      }
      throw erro;
    }
  } catch (erro) {
    if (etapa === 'PENDENTE') await alterar({ etapa, carga: null });
    const mensagem = erro instanceof ErroPlataforma ? erro.message
      : erro instanceof Error && !(erro instanceof TypeError) && erro.name === 'Error' && erro.constructor === Error
        ? erro.message : 'A plataforma não confirmou a operação. Consulte a tentativa antes de repetir.';
    return { status: 422, erro: mensagem, numero: numero?.toString(), referencia, podeEditar: etapa === 'PENDENTE' };
  } finally {
    await prisma.envioVenda.updateMany({ where: { id: venda.id, bloqueadoAte }, data: { bloqueadoAte: null } });
  }
}
