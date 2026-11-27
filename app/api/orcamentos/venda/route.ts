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
  const material = new URL(request.url).searchParams.get('material')?.trim();
  if (material !== undefined) {
    if (material.length < 3 || material.length > 100) return json({ erro: 'Informe de 3 a 100 caracteres para consultar o catálogo.' }, 400);
    try {
      const query = new URLSearchParams({ criterio: '2', limite: '25', nome: material });
      const produtos = await bling<{ codigo: string; nome: string }[]>(await tokenBling(), '/produtos?' + query);
      return json({ produtos: produtos.filter(p => p.codigo).map(({ codigo, nome }) => ({ codigo, nome })) });
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
        const { status, ...resultado } = await retomarVenda(dados.retomar, usuario.id);
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
    const { status, ...dados } = await enviarVenda(venda, usuario.id);
    return json(dados, status);
  } catch {
    return json({ erro: 'O envio ainda não pôde ser confirmado. Consulte a mesma tentativa novamente.' }, 503);
  }
}
