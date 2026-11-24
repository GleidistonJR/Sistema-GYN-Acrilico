import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { exigirPerfil } from '@/lib/autorizacao';
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PainelPerfil from "./PainelPerfil";
import AtualizacaoPagina from '@/app/(sistema)/components/AtualizacaoPagina';

interface DetalhesProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}

export interface LinhaRelatorio {
  dataObjeto: Date;
  dataStr: string;
  batidas: string[];
  trabalhado: number;
  abono: number;
  statusDia: "TRABALHADO" | "FERIADO" | "FALTA" | "ATESTADO" | "FOLGA";
}

export const metadata: Metadata = { title: 'Detalhes do Colaborador' };

export default async function DetalhesColaborador({ params, searchParams }: DetalhesProps) {
  const { id } = await params;
  const { mes } = await searchParams;

  const idNumero = Number(id);
  if (!Number.isSafeInteger(idNumero)) return notFound();
  const usuario = await exigirPerfil(idNumero);

  let mesInicialValue = "";
  let anoAlvo = 0;
  let mesAlvo = 0;

  const hoje = new Date();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    mesInicialValue = mes;
    const [anoStr, mesStr] = mes.split("-");
    anoAlvo = Number(anoStr);
    mesAlvo = Number(mesStr) - 1;
  } else {
    anoAlvo = hoje.getFullYear();
    mesAlvo = hoje.getMonth();
    mesInicialValue = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}`;
  }

  const inicioMes = new Date(anoAlvo, mesAlvo, 1);
  const fimMes = new Date(anoAlvo, mesAlvo + 1, 0, 23, 59, 59, 999);

  const colaborador = await prisma.colaborador.findUnique({
    where: { id: idNumero },
    select: {
      id: true, nome: true, cargo: true, cpf: true, inativadoEm: true,
      pontos: {
        where: { dataHora: { gte: inicioMes, lte: fimMes } },
        orderBy: { dataHora: 'asc' },
      },
    },
  });

  if (!colaborador) return notFound();

  const colegas = usuario.role === 'ADMIN' ? await prisma.colaborador.findMany({
    where: { inativadoEm: colaborador.inativadoEm ? { not: null } : null },
    orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    select: { id: true, nome: true },
  }) : [];
  const posicao = colegas.findIndex(colega => colega.id === colaborador.id);
  const anterior = posicao > 0 ? colegas[posicao - 1] : undefined;
  const proximo = posicao >= 0 ? colegas[posicao + 1] : undefined;

  const pontosPorDia: { [data: string]: Date[] } = {};
  const minutosAtestadoPorDia: { [data: string]: number } = {};
  const diasComFeriado = new Set<string>();

  colaborador.pontos.forEach((ponto) => {
    const dataStr = ponto.dataHora.toISOString().split('T')[0];
    if (ponto.tipo === "Feriado") {
      diasComFeriado.add(dataStr);
      return;
    }
    if (ponto.tipo.startsWith("Atestado")) {
      const partes = ponto.tipo.split(": ");
      minutosAtestadoPorDia[dataStr] = (minutosAtestadoPorDia[dataStr] || 0) + (partes[1] ? Number(partes[1]) : 0);
      return;
    }
    if (!pontosPorDia[dataStr]) pontosPorDia[dataStr] = [];
    pontosPorDia[dataStr].push(ponto.dataHora);
  });

  const linhasParaImpressao: LinhaRelatorio[] = [];
  const ultimoDiaMes = fimMes.getDate();
  let diasUteisPadraoContados = 0;

  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  for (let dia = 1; dia <= ultimoDiaMes; dia++) {
    const dataCorrente = new Date(anoAlvo, mesAlvo, dia, 12, 0, 0);
    const dataCorrenteSemHora = new Date(anoAlvo, mesAlvo, dia);
    const ehDiaFuturo = dataCorrenteSemHora > hojeSemHora;
    const dataStr = dataCorrente.toISOString().split('T')[0];
    const ehDiaUtil = dataCorrente.getDay() >= 1 && dataCorrente.getDay() <= 5;
    const ehFeriado = diasComFeriado.has(dataStr);
    const horarios = pontosPorDia[dataStr] || [];
    const minsAtestado = minutosAtestadoPorDia[dataStr] || 0;

    horarios.sort((a, b) => a.getTime() - b.getTime());
    let minutosTrabalhadosNoDia = 0;
    for (let i = 0; i < horarios.length; i += 2) {
      if (horarios[i + 1]) {
        minutosTrabalhadosNoDia += Math.floor((horarios[i + 1].getTime() - horarios[i].getTime()) / 1000 / 60);
      }
    }

    if (ehDiaUtil && !ehFeriado) {
      diasUteisPadraoContados++;
    }

    let statusDia: LinhaRelatorio["statusDia"] = "FOLGA";
    if (ehFeriado) statusDia = "FERIADO";
    else if (minutosTrabalhadosNoDia > 0) statusDia = "TRABALHADO";
    else if (minsAtestado > 0) statusDia = "ATESTADO";
    else if (ehDiaUtil && !ehDiaFuturo) statusDia = "FALTA"; // só marca falta se já passou

    linhasParaImpressao.push({
      dataObjeto: dataCorrente,
      dataStr,
      batidas: horarios.map(h => h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })),
      trabalhado: minutosTrabalhadosNoDia,
      abono: minsAtestado,
      statusDia
    });
  }

  return (
    <>
      <AtualizacaoPagina />
      <PainelPerfil role={usuario.role}
        key={colaborador.id}
        colaborador={colaborador}
        linhasParaImpressao={linhasParaImpressao}
        diasUteisIniciais={diasUteisPadraoContados}
        mesInicialValue={mesInicialValue}
        navegacao={anterior || proximo ? (
          <nav aria-label="Navegar entre colaboradores" className="mb-4 grid grid-cols-2 gap-2">
            {[anterior, proximo].map((destino, indice) => {
              const voltar = indice === 0;
              const Icone = voltar ? ChevronLeft : ChevronRight;
              const rotulo = voltar ? 'Colaborador anterior' : 'Próximo colaborador';
              return destino && (
                <Link key={destino.id}
                  href={{ pathname: `/administracao/colaboradores/${destino.id}`, query: { mes: mesInicialValue } }}
                  aria-label={`${rotulo}: ${destino.nome}`}
                  className={`row-start-1 flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-secondary hover:bg-surface-muted ${voltar ? 'col-start-1 justify-self-start' : 'col-start-2 flex-row-reverse justify-self-end text-right'}`}>
                  <Icone size={18} aria-hidden="true" className="shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">{rotulo}</span>
                    <span className="block truncate font-medium">{destino.nome}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : null}
      />
    </>
  );
}
