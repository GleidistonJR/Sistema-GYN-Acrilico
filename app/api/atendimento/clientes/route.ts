import { permite, PERFIS_ATENDIMENTO } from '@/lib/permissoes';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { mesmaOrigem, privado } from '@/lib/whatsapp/acesso';

export async function GET(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !permite(PERFIS_ATENDIMENTO, usuario.role)) return Response.json({ erro: 'Acesso não autorizado.' }, { status: 401, headers: privado });
  const params = new URL(request.url).searchParams;
  const busca = (params.get('busca') || '').slice(0, 120);
  const etiqueta = (params.get('etiqueta') || '').slice(0, 100);
  const pagina = Math.max(1, Math.min(10000, Math.floor(Number(params.get('pagina')) || 1)));
  const fila = params.get('fila') || 'meus';
  const meus = fila === 'meus';
  const fixacao = meus ? Prisma.sql`array_position(operador."clientesFixados", c.id)` : Prisma.sql`NULL::int`;
  const scope = fila === 'fila' ? Prisma.sql`c."responsavelId" IS NULL`
    : fila === 'todos' ? Prisma.sql`TRUE` : Prisma.sql`c."responsavelId" = ${usuario.id}`;
  const pattern = '%' + busca.replace(/[\\%_]/g, '\\$&') + '%';
  const telefoneBusca = /^[\d\s+().-]+$/.test(busca) ? busca.replace(/\D/g, '') : '';
  const search = busca ? Prisma.sql`AND (c.nome ILIKE ${pattern} OR c.telefone LIKE ${telefoneBusca ? '%' + telefoneBusca + '%' : pattern})` : Prisma.empty;
  const tag = etiqueta ? Prisma.sql`AND EXISTS (SELECT 1 FROM "ClienteEtiqueta" e WHERE e."clienteId" = c.id AND e."etiquetaId" = ${etiqueta})` : Prisma.empty;
  const [clientes, etiquetas] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; nome: string; telefone: string | null; responsavelId: string | null; naoLida: boolean; responsavelNome: string | null; fixado: boolean }>>(Prisma.sql`
    SELECT c.id, c.nome, c.telefone, c."responsavelId",
      (${fixacao}) IS NOT NULL AS fixado,
      COALESCE(NULLIF(u.apelido, ''), co.nome, CASE WHEN u.role = 'RECEPCAO' THEN 'Recepção' END, u.email) AS "responsavelNome",
      (c."versaoEntrada" > GREATEST(COALESCE(l.versao, 0), c."versaoEntradaExcluida")) AS "naoLida"
    FROM "Cliente" c LEFT JOIN "LeituraConversa" l ON l."clienteId" = c.id AND l."userId" = ${usuario.id}
    LEFT JOIN "User" u ON u.id = c."responsavelId"
    LEFT JOIN "Colaborador" co ON co."userId" = u.id
    ${meus ? Prisma.sql`JOIN "User" operador ON operador.id = ${usuario.id}` : Prisma.empty}
    WHERE (c."conversaExcluidaEm" IS NULL OR c."ultimaMensagemEm" IS NOT NULL) AND ${scope} ${search} ${tag}
    ORDER BY ${meus ? Prisma.sql`${fixacao} ASC NULLS LAST,` : Prisma.empty} c."ultimaMensagemEm" DESC NULLS LAST, c.nome, c.id LIMIT 51 OFFSET ${(pagina - 1) * 50}
    `),
    prisma.etiqueta.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
  ]);
  return Response.json({ clientes: clientes.slice(0, 50), temMais: clientes.length > 50, etiquetas }, { headers: privado });
}

export async function PATCH(request: Request) {
  const usuario = await obterUsuarioSessao();
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: privado });
  if (!usuario || !permite(PERFIS_ATENDIMENTO, usuario.role) || !mesmaOrigem(request)) {
    return json({ erro: 'Acesso não autorizado.' }, 403);
  }
  const dados = await request.json().catch(() => null);
  const { id, acao, alvo } = dados ?? {};
  const valido = (valor: unknown): valor is string => typeof valor === 'string' && valor.length > 0 && valor.length <= 100;
  if (!valido(id) || !['fixar', 'desafixar', 'antes', 'depois'].includes(acao)
    || ((acao === 'antes' || acao === 'depois') && (!valido(alvo) || alvo === id))) {
    return json({ erro: 'Posição inválida.' }, 400);
  }

  const salvo = await prisma.$transaction(async tx => {
    const [operador] = await tx.$queryRaw<Array<{ clientesFixados: string[] }>>`
      SELECT "clientesFixados" FROM "User" WHERE id = ${usuario.id} FOR UPDATE`;
    const carteira = await tx.cliente.findMany({
      where: { responsavelId: usuario.id, id: { in: [id, ...((acao === 'antes' || acao === 'depois') ? [alvo] : [])] } },
      select: { id: true },
    });
    if (!operador || !carteira.some(c => c.id === id) || ((acao === 'antes' || acao === 'depois') && !carteira.some(c => c.id === alvo))) return false;
    const fixados = operador.clientesFixados.filter(clienteId => clienteId !== id);
    if (acao === 'fixar') fixados.unshift(id);
    if (acao === 'antes' || acao === 'depois') {
      const indice = fixados.indexOf(alvo);
      fixados.splice(indice < 0 ? fixados.length : indice + Number(acao === 'depois'), 0, id);
    }
    await tx.user.update({ where: { id: usuario.id }, data: { clientesFixados: fixados } });
    return true;
  });
  return salvo ? json({ ok: true }) : json({ erro: 'Este cliente não faz parte da sua carteira.' }, 404);
}
