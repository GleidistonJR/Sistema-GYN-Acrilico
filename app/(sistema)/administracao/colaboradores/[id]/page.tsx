import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ModalAtestado from "./ModalAtestado";
import TabelaHistoricoPonto from "./TabelaHistoricoPonto";
import ModalCriarPonto from "./ModalCriarPonto";

interface DetalhesProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}

export default async function DetalhesColaborador({ params, searchParams }: DetalhesProps) {
  const { id } = await params;
  const { mes } = await searchParams;

  const idNumero = Number(id);
  if (isNaN(idNumero)) return notFound();

  let filtroData = {};
  let mesInicialValue = "";

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    mesInicialValue = mes;
    const [ano, mesStr] = mes.split("-");
    const inicioMes = new Date(Number(ano), Number(mesStr) - 1, 1);
    const fimMes = new Date(Number(ano), Number(mesStr), 0, 23, 59, 59, 999);
    filtroData = { dataHora: { gte: inicioMes, lte: fimMes } };
  } else {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    mesInicialValue = `${ano}-${String(mesAtual + 1).padStart(2, '0')}`;
    filtroData = { dataHora: { gte: new Date(ano, mesAtual, 1), lte: new Date(ano, mesAtual + 1, 0, 23, 59, 59, 999) } };
  }

  const colaborador = await prisma.colaborador.findUnique({
    where: { id: idNumero },
    include: {
      pontos: {
        where: filtroData,
        orderBy: { dataHora: 'asc' },
      },
    },
  });

  if (!colaborador) return notFound();

  const MINUTOS_ESPERADOS_POR_DIA = 8 * 60 + 30; // 510 minutos

  const diasUnicos = new Set<string>();
  const pontosPorDia: { [data: string]: Date[] } = {};
  let totalMinutosAtestado = 0;
  const diasComAtestado = new Set<string>();

  colaborador.pontos.forEach((ponto) => {
    const dataStr = ponto.dataHora.toISOString().split('T')[0];

    if (ponto.tipo.startsWith("Atestado")) {
      diasComAtestado.add(dataStr);
      const partes = ponto.tipo.split(": ");
      if (partes[1]) {
        totalMinutosAtestado += Number(partes[1]);
      }
      return;
    }

    diasUnicos.add(dataStr);
    if (!pontosPorDia[dataStr]) {
      pontosPorDia[dataStr] = [];
    }
    pontosPorDia[dataStr].push(ponto.dataHora);
  });

  let totalMinutosTrabalhadosReais = 0;
  let totalMinutosEsperados = 0;
  let diasCompletos = 0;
  let diasIncompletos = 0;

  const todosOsDiasDoMes = new Set([...diasUnicos, ...diasComAtestado]);

  todosOsDiasDoMes.forEach((dataStr) => {
    const data = new Date(`${dataStr}T12:00:00`);
    const diaDaSemana = data.getDay();
    if (diaDaSemana >= 1 && diaDaSemana <= 5) {
      totalMinutosEsperados += MINUTOS_ESPERADOS_POR_DIA;
    }
  });

  Object.entries(pontosPorDia).forEach(([dataStr, horarios]) => {
    horarios.sort((a, b) => a.getTime() - b.getTime());
    let minutosTrabalhadosNoDia = 0;

    for (let i = 0; i < horarios.length; i += 2) {
      if (horarios[i + 1]) {
        minutosTrabalhadosNoDia += Math.floor((horarios[i + 1].getTime() - horarios[i].getTime()) / 1000 / 60);
      }
    }

    totalMinutosTrabalhadosReais += minutosTrabalhadosNoDia;

    let minutosAtestadoDoDia = 0;
    const pontoAtestadoDoDia = colaborador.pontos.find(p => p.tipo.startsWith("Atestado") && p.dataHora.toISOString().split('T')[0] === dataStr);
    if (pontoAtestadoDoDia) {
      minutosAtestadoDoDia = Number(pontoAtestadoDoDia.tipo.split(": ")[1] || 0);
    }

    const totalCompensoNoDia = minutosTrabalhadosNoDia + minutosAtestadoDoDia;

    const data = new Date(`${dataStr}T12:00:00`);
    if (data.getDay() >= 1 && data.getDay() <= 5) {
      if (totalCompensoNoDia >= MINUTOS_ESPERADOS_POR_DIA) {
        diasCompletos++;
      } else {
        diasIncompletos++;
      }
    } else {
      diasCompletos++;
    }
  });

  diasComAtestado.forEach(dataStr => {
    if (!diasUnicos.has(dataStr)) {
      const partes = colaborador.pontos.find(p => p.dataHora.toISOString().split('T')[0] === dataStr)?.tipo.split(": ");
      const minsAtestado = partes ? Number(partes[1] || 0) : 0;

      if (minsAtestado >= MINUTOS_ESPERADOS_POR_DIA) {
        diasCompletos++;
      } else {
        diasIncompletos++;
      }
    }
  });

  const totalDiasAtestado = diasComAtestado.size;

  const totalMinutosComputados = totalMinutosTrabalhadosReais + totalMinutosAtestado;
  const saldoMinutosCompleto = totalMinutosComputados - totalMinutosEsperados;
  const isPositivo = saldoMinutosCompleto >= 0;

  const formatarMinutos = (minutosTotais: number) => {
    const hrs = Math.floor(minutosTotais / 60);
    const mins = minutosTotais % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  const saldoFormatado = formatarMinutos(Math.abs(saldoMinutosCompleto));

  return (
    <main className="p-8 max-w-5xl m-auto text-gray-700">
      {/* Topo / Filtro */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-center lg:text-left text-gray-800">Espelho de Ponto Individual</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de assiduidade, abonos médicos e banco de horas</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <ModalCriarPonto colaboradorId={colaborador.id} />
          <ModalAtestado colaboradorId={colaborador.id} />

          <form method="GET" className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
            <label htmlFor="mes" className="text-xs font-semibold uppercase text-gray-500 tracking-wider pl-1">Período:</label>
            <input
              type="month"
              id="mes"
              name="mes"
              defaultValue={mesInicialValue}
              className="border rounded px-2 py-1 text-sm bg-gray-50 focus:outline-blue-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded transition-colors">
              Buscar
            </button>
          </form>
        </div>
      </div>

      {/* Grid de Informações Básicas e Banco de Horas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border md:col-span-1">
          <h2 className="text-xs font-bold mb-3 border-b pb-2 text-gray-400 uppercase tracking-wider">Dados do Contrato</h2>
          <p className="mb-1.5 text-sm"><strong>Nome:</strong> {colaborador.nome}</p>
          <p className="mb-1.5 text-sm"><strong>Cargo:</strong> {colaborador.cargo}</p>
          <p className="mb-1.5 text-sm"><strong>CPF:</strong> {colaborador.cpf}</p>
          <p className="text-sm"><strong>Salário Base:</strong> {colaborador.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-50/50 p-4 rounded-lg flex flex-col justify-center items-center border border-blue-100">
            <span className="text-xs font-bold uppercase text-blue-700 tracking-wider text-center">Tempo Total Computado</span>
            <span className="text-3xl font-extrabold text-blue-600 mt-2">{formatarMinutos(totalMinutosComputados)}</span>
            <span className="text-[11px] text-blue-500 text-center mt-1">Horas Efetivas + Abonos de Atestados</span>
          </div>

          <div className={`p-4 rounded-lg flex flex-col justify-center items-center border transition-colors ${
            isPositivo ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="text-xs font-bold uppercase tracking-wider text-center">Saldo Atual do Banco de Horas</span>
            <span className="text-3xl font-extrabold mt-2">
              {isPositivo ? `+ ${saldoFormatado}` : `- ${saldoFormatado}`}
            </span>
            <span className="text-[11px] font-medium mt-1 text-center">
              {isPositivo ? 'Crédito acumulado para o colaborador' : 'Horas em débito (A regularizar)'}
            </span>
          </div>
        </div>
      </div>

      {/* PAINEL DE METRICAS ESCLARECEDORAS */}
      <h2 className="text-xl font-bold mb-1 text-gray-800">Indicadores de Frequência do Mês</h2>
      <p className="text-xs text-gray-500 mb-4">Métricas calculadas com base na jornada diária padrão de 8h 30m nos dias úteis movimentados.</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase block">Horas Trabalhadas</span>
          <span className="text-xl font-bold text-gray-800 block mt-1">{formatarMinutos(totalMinutosTrabalhadosReais)}</span>
          <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight">Tempo em atividade física presencial</span>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <span className="text-xs font-bold text-purple-700 uppercase block">Horas Abonadas</span>
          <span className="text-xl font-bold text-purple-600 block mt-1">{formatarMinutos(totalMinutosAtestado)}</span>
          <span className="text-[11px] text-purple-500 block mt-0.5 leading-tight">Tempo justificado por atestados médicos ({totalDiasAtestado} dia(s)).</span>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-green-500">
          <span className="text-xs font-bold text-green-700 uppercase block">Jornadas Cumpridas</span>
          <span className="text-xl font-bold text-green-600 block mt-1">{diasCompletos} dias</span>
          <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight">Dias em que a meta de 8h 30m foi atingida (somando ponto + atestado).</span>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-orange-500">
          <span className="text-xs font-bold text-orange-700 uppercase block">Jornadas Incompletas</span>
          <span className="text-xl font-bold text-orange-600 block mt-1">{diasIncompletos} dias</span>
          <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight">Dias úteis trabalhados que fecharam abaixo de 8h 30m de carga horária.</span>
        </div>

      </div>

      <TabelaHistoricoPonto
        pontosIniciais={colaborador.pontos}
        nomeColaborador={colaborador.nome}
      />
    </main>
  );
}