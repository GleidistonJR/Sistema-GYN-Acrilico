import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, Boxes, ClipboardList, Clock3, KeyRound,
  Layers3, MessageCircle, Package, PackageMinus, UsersRound,
} from 'lucide-react';
import { exigirUsuario } from '@/lib/autorizacao';
import { prisma } from '@/lib/prisma';
import { calcularReposicao } from '@/lib/reposicaoMateriais';

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const painel = 'rounded-2xl border border-line bg-surface';
const atalhos = [
  { nome: 'Materiais', href: '/materiais', Icone: Layers3, cor: 'bg-info-soft text-info-ink' },
  { nome: 'Produtos', href: '/produtos', Icone: Package, cor: 'bg-violet-soft text-violet-ink' },
  { nome: 'Orçamentos', href: '/orcamentos', Icone: ClipboardList, cor: 'bg-info-soft text-info-ink' },
  { nome: 'Atendimento', href: '/atendimento', Icone: MessageCircle, cor: 'bg-success-soft text-success-ink' },
  { nome: 'Colaboradores', href: '/administracao/colaboradores', Icone: UsersRound, cor: 'bg-violet-soft text-violet-ink' },
  { nome: 'Acessos avulsos', href: '/administracao/acessos', Icone: KeyRound, cor: 'bg-warning-soft text-warning-ink' },
  { nome: 'Relatório de ponto', href: '/relatorioPontos', Icone: Clock3, cor: 'bg-info-soft text-info-ink' },
];

const filtros = [
  { valor: 'materiais', nome: 'Materiais' },
  { valor: 'produtos', nome: 'Produtos' },
] as const;

export default async function Administracao({ searchParams }: {
  searchParams: Promise<{ estoque?: string }>;
}) {
  await exigirUsuario(['ADMIN']);
  const filtro = (await searchParams).estoque === 'produtos' ? 'produtos' : 'materiais';
  const estoque = { id: true, nome: true, estoque: true, estoquePadrao: true } as const;
  const [materiais, produtos] = await Promise.all([
    prisma.material.findMany({ select: { ...estoque, cor: true, espessura: true, categoria: { select: { nome: true } } } }),
    prisma.produto.findMany({ select: estoque }),
  ]);
  const itens = filtro === 'materiais' ? materiais.map(material => ({
    ...material,
    nome: [material.nome, material.cor, material.espessura && `${material.espessura} mm`]
      .filter(Boolean).join(' · ') || material.categoria.nome,
    categoria: material.categoria.nome,
  })) : produtos.map(produto => ({ ...produto, categoria: null }));

  const criticos = itens.map(item => ({
    ...item,
    repor: calcularReposicao(item.estoque, item.estoquePadrao),
  })).filter(item => item.repor > 0);
  const semEstoque = itens.filter(item => item.estoque <= 0).length;
  const prioridade = criticos.sort((a, b) =>
    a.estoque / a.estoquePadrao - b.estoque / b.estoquePadrao || b.repor - a.repor ||
    a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 6);

  const abaixo = itens.filter(item => item.estoque > 0 && calcularReposicao(item.estoque, item.estoquePadrao) > 0).length;
  const normal = itens.filter(item => item.estoque > 0 && item.estoquePadrao > 0 && item.estoque >= item.estoquePadrao).length;
  const situacoes = [
    { nome: 'Sem estoque', total: semEstoque, barra: 'bg-danger-ink', cor: 'text-danger-ink' },
    { nome: 'Abaixo do padrão', total: abaixo, barra: 'bg-warning-ink', cor: 'text-warning-ink' },
    { nome: 'Estoque em dia', total: normal, barra: 'bg-success-ink', cor: 'text-success-ink' },
    { nome: 'Sem padrão definido', total: itens.length - semEstoque - abaixo - normal, barra: 'bg-muted', cor: 'text-muted' },
  ];
  const indicadores = [
    { nome: 'Itens cadastrados', total: itens.length, Icone: Boxes, cor: 'bg-info-soft text-info-ink' },
    { nome: 'Sem estoque', total: semEstoque, Icone: PackageMinus, cor: 'bg-danger-soft text-danger-ink' },
    { nome: 'Com reposição indicada', total: criticos.length, Icone: ClipboardList, cor: 'bg-warning-soft text-warning-ink' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-7 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Administração</h1>
          <p className="mt-2 text-sm text-muted sm:text-base">Acompanhe o estoque e acesse as ferramentas de gestão.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="#atalhos-admin" className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-secondary hover:bg-surface-hover">
            Acesso rápido
          </a>
          <Link href={`/${filtro}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
            Abrir estoque <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
      </header>

      <section aria-labelledby="visao-estoque" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="visao-estoque" className="text-xl font-semibold text-foreground">Visão do estoque</h2>
          <nav aria-label="Tipo de estoque" className="inline-flex rounded-xl border border-line bg-surface-muted p-1">
            {filtros.map(({ valor, nome }) => (
              <Link
                key={valor}
                href={`/administracao?estoque=${valor}`}
                scroll={false}
                aria-current={filtro === valor ? 'page' : undefined}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${filtro === valor
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'}`}
              >
                {nome}
              </Link>
            ))}
          </nav>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {indicadores.map(({ nome, total, Icone, cor }) => (
            <div className={`${painel} flex items-center gap-4 p-4`} key={nome}>
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${cor}`}><Icone size={21} aria-hidden /></span>
              <div>
                <dt className="text-sm text-muted">{nome}</dt>
                <dd className="text-2xl font-bold tabular-nums text-foreground">{numero.format(total)}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="grid items-start gap-4 lg:grid-cols-[2fr_3fr]">
          <section className={`${painel} p-5 sm:p-6`} aria-labelledby="situacao-estoque">
            <h3 id="situacao-estoque" className="text-lg font-semibold text-foreground">Situação dos itens</h3>
            <p className="mt-1 text-sm text-muted">Distribuição pelo saldo e pelo estoque padrão.</p>
            <ul className="mt-5 space-y-5">
              {situacoes.map(({ nome, total, barra, cor }) => (
                <li key={nome}>
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-secondary">{nome}</span>
                    <span className={`font-semibold tabular-nums ${cor}`}>{numero.format(total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                    <div className={`h-full rounded-full ${barra}`} style={{ width: `${total / (itens.length || 1) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${painel} p-5 sm:p-6`} aria-labelledby="prioridade-estoque">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="prioridade-estoque" className="text-lg font-semibold text-foreground">Prioridades de reposição</h3>
                <p className="mt-1 text-sm text-muted">Até 6 itens com menor saldo em relação ao padrão.</p>
              </div>
              <Link href={`/${filtro}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-ink hover:underline">
                Ver {filtro} <ArrowRight size={15} aria-hidden />
              </Link>
            </div>
            {prioridade.length === 0 ? (
              <p className="mt-5 rounded-xl bg-surface-soft p-4 text-sm text-muted">Nenhum item com reposição indicada. O cálculo usa o estoque padrão cadastrado.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {prioridade.map(item => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-foreground">{item.nome}</p>
                      <p className="mt-1 text-xs text-muted">
                        {item.categoria ? `${item.categoria} · ` : ''}
                        Saldo {numero.format(item.estoque)} de {numero.format(item.estoquePadrao)} un.
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${item.estoque <= 0
                      ? 'bg-danger-soft text-danger-ink' : 'bg-warning-soft text-warning-ink'}`}>
                      Repor {numero.format(item.repor)} un.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>

      <nav aria-labelledby="atalhos-admin">
        <h2 id="atalhos-admin" className="mb-4 scroll-mt-20 text-xl font-semibold text-foreground">Acesso rápido</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {atalhos.map(({ nome, href, Icone, cor }) => (
            <li key={href}>
              <Link href={href} className={`${painel} group flex h-full min-h-16 items-center gap-3 p-3 text-sm font-semibold text-foreground hover:border-line-strong hover:bg-surface-hover`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${cor}`}><Icone size={18} aria-hidden /></span>
                <span className="flex-1">{nome}</span>
                <ArrowUpRight size={16} className="shrink-0 text-muted group-hover:text-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
