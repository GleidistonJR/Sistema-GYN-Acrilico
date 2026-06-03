import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ModalAtestado from "./ModalAtestado";
import ModalCriarPonto from "./ModalCriarPonto";
import BotaoImprimir from "./BotaoImprimir";
import TabelaHistoricoPonto from "./TabelaHistoricoPonto";
import PainelFrequenciaInterativo from "./PainelFrequenciaInterativo";

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

export default async function DetalhesColaborador({ params, searchParams }: DetalhesProps) {
  const { id } = await params;
  const { mes } = await searchParams;

  const idNumero = Number(id);
  if (isNaN(idNumero)) return notFound();

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
    include: {
      pontos: {
        where: { dataHora: { gte: inicioMes, lte: fimMes } },
        orderBy: { dataHora: 'asc' },
      },
    },
  });

  if (!colaborador) return notFound();

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

  for (let dia = 1; dia <= ultimoDiaMes; dia++) {
    const dataCorrente = new Date(anoAlvo, mesAlvo, dia, 12, 0, 0);
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
    else if (ehDiaUtil) statusDia = "FALTA";

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
      <PainelFrequenciaInterativo 
        colaborador={colaborador}
        linhasParaImpressao={linhasParaImpressao}
        diasUteisIniciais={diasUteisPadraoContados}
        mesInicialValue={mesInicialValue}
      />
    </>
  );
}