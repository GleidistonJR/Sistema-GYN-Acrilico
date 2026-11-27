import { obterUsuarioSessao } from '@/lib/sessao';
import { permite, PERFIS_COMERCIAIS } from '@/lib/permissoes';
import { mesmaOrigem } from '@/lib/whatsapp/acesso';
import { bling, configuracaoBling, formasPagamento, tokenBling } from '@/lib/integracoes/bling';
import { prisma } from '@/lib/prisma';
import { configuracaoTrello } from '@/lib/integracoes/trello';
import { validarVenda } from '@/lib/integracoes/dadosVenda';
import { enviarVenda, retomarVenda } from '@/lib/integracoes/enviarVenda';

export const maxDuration = 90;
const json = (dados: object, status = 200) => Response.json(dados, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !permite(PERFIS_COMERCIAIS, usuario.role)) return json({ erro: 'Acesso não autorizado.' }, 403);
  if (!configuracaoBling() || !configuracaoTrello()) return json({ erro: 'Peça a um administrador para configurar Bling e Trello.' }, 503);
  const parametros = new URL(request.url).searchParams;
  const cliente = parametros.get('cliente')?.trim();
  if (cliente !== undefined) {
    if (cliente.length < 3 || cliente.length > 100) return json({ erro: 'Digite de 3 a 100 caracteres para buscar clientes.' }, 400);
    try {
      const documento = cliente.replace(/[./\s-]/g, '').toUpperCase();
      const porDocumento = /^(?:\d{11}|[A-Z0-9]{12}\d{2})$/.test(documento) && /\d/.test(cliente);
      const consulta = new URLSearchParams({ criterio: '1', limite: '20',
        [porDocumento ? 'numeroDocumento' : 'pesquisa']: porDocumento ? documento : cliente });
      const contatos = await bling<{ id: number; nome: string; numeroDocumento?: string; celular?: string; telefone?: string; situacao?: string }[]>(
        await tokenBling(), '/contatos?' + consulta);
      return json({ clientes: contatos.filter(c => c.situacao === 'A' || c.situacao === 'S').map(c => ({
        id: c.id, nome: c.nome, documento: c.numeroDocumento ?? '', telefone: c.celular || c.telefone || '',
      })) });
    } catch {
      return json({ erro: 'Não foi possível buscar os clientes do Bling.' }, 502);
    }
  }
  const material = parametros.get('material')?.trim();
  if (material !== undefined) {
    if (material.length < 3 || material.length > 100) return json({ erro: 'Informe de 3 a 100 caracteres para consultar o catálogo.' }, 400);
    try {
      const token = await tokenBling();
      const normalizar = (valor: string) => valor.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
      const termos = normalizar(material).replace(/[%_]/g, ' ').split(/\s+/).filter(Boolean);
      if (!termos.length) return json({ produtos: [] });
      const pesquisar = (nome: string, limite: string) => bling<{ codigo: string; nome: string }[]>(token,
        '/produtos?' + new URLSearchParams({ criterio: '2', limite, nome }));
      let produtos = await pesquisar('%' + termos.join('%') + '%', '25');
      if (!produtos.length && termos.length > 1) {
        const maior = termos.reduce((a, b) => a.length >= b.length ? a : b);
        produtos = (await pesquisar('%' + maior + '%', '100')).filter(p => termos.every(termo => normalizar(p.nome).includes(termo)));
      }
      return json({ produtos: produtos.filter(p => p.codigo).slice(0, 25).map(({ codigo, nome }) => ({ codigo, nome })) });
    } catch {
      return json({ erro: 'Não foi possível consultar o catálogo do Bling.' }, 502);
    }
  }
  const pendentes = (await prisma.envioVenda.findMany({
    where: { usuarioId: usuario.id, carga: { not: null } },
    orderBy: { criadoEm: 'desc' },
    take: 30,
    select: { id: true, blingNumero: true, criadoEm: true },
  })).map(p => ({ ...p, blingNumero: p.blingNumero?.toString() }));
  try {
    const formas = await formasPagamento(await tokenBling());
    return json({ formas: formas.map(({ id, descricao }) => ({ id, descricao })), pendentes });
  } catch {
    return json({ pendentes, erro: 'Não foi possível consultar formas de pagamento. Confira a conexão do Bling com o administrador.' }, 502);
  }
}

export async function POST(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !permite(PERFIS_COMERCIAIS, usuario.role) || !mesmaOrigem(request)) {
    return json({ erro: 'Acesso não autorizado.' }, 403);
  }
  if (Number(request.headers.get('content-length')) > 250_000) return json({ erro: 'Venda muito grande.' }, 413);
  let venda;
  try {
    const corpo = await request.text();
    if (corpo.length > 250_000) return json({ erro: 'Venda muito grande.' }, 413);
    const dados = JSON.parse(corpo);
    if (dados && typeof dados.retomar === 'string') {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(dados.retomar)) return json({ erro: 'Referência de venda inválida.' }, 400);
      try {
        const { status, ...resultado } = await retomarVenda(dados.retomar, usuario.id, usuario.colaborador?.nome);
        return json(resultado, status);
      } catch {
        return json({ erro: 'O envio ainda não pôde ser confirmado. Tente novamente.' }, 503);
      }
    }
    venda = validarVenda(dados);
  } catch (erro) {
    return json({ erro: erro instanceof Error && !(erro instanceof SyntaxError) ? erro.message : 'Dados da venda inválidos.' }, 400);
  }
  try {
    const { status, ...dados } = await enviarVenda(venda, usuario.id, usuario.colaborador?.nome);
    return json(dados, status);
  } catch {
    return json({ erro: 'O envio ainda não pôde ser confirmado. Consulte a mesma tentativa novamente.' }, 503);
  }
}
