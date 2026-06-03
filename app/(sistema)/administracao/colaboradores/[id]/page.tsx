import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ModalAtestado from "./ModalAtestado";
import TabelaHistoricoPonto from "./TabelaHistoricoPonto";
import ModalCriarPonto from "./ModalCriarPonto";
import BotaoImprimir from "./BotaoImprimir";

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
  const TOLERANCIA_CLT_MINUTOS = 10;

  const diasUnicos = new Set<string>();
  const pontosPorDia: { [data: string]: Date[] } = {};
  let totalMinutosAtestado = 0;
  const diasComAtestado = new Set<string>();
  
  // Conjunto para monitorar todos os dias que tiveram qualquer atividade (ponto ou atestado)
  const diasAtivosNoMes = new Set<string>();

  colaborador.pontos.forEach((ponto) => {
    const dataStr = ponto.dataHora.toISOString().split('T')[0];
    diasAtivosNoMes.add(dataStr); // Conta como dia trabalhado/justificado

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
  let diasCompletos = 0;
  let diasIncompletos = 0;
  let saldoMinutosCompleto = 0; 

  interface LinhaRelatorio {
    dataObjeto: Date;
    batidas: string[];
    trabalhado: number;
    abono: number;
    saldoTexto: string;
  }
  const linhasParaImpressao: { [data: string]: LinhaRelatorio } = {};

  // 1. PROCESSAR DIAS COM BATIDAS FÍSICAS
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

    const totalCompensadoNoDia = minutosTrabalhadosNoDia + minutosAtestadoDoDia;
    const data = new Date(`${dataStr}T12:00:00`);
    const ehDiaUtil = data.getDay() >= 1 && data.getDay() <= 5;

    let textoSaldo = "0h 00m";

    if (ehDiaUtil) {
      const desvioDiario = totalCompensadoNoDia - MINUTOS_ESPERADOS_POR_DIA;

      if (Math.abs(desvioDiario) <= TOLERANCIA_CLT_MINUTOS) {
        saldoMinutosCompleto += 0; 
        diasCompletos++;
      } else {
        saldoMinutosCompleto += desvioDiario;
        textoSaldo = desvioDiario > 0 
          ? `+ ${Math.floor(desvioDiario / 60)}h ${String(desvioDiario % 60).padStart(2, '0')}m` 
          : `- ${Math.floor(Math.abs(desvioDiario) / 60)}h ${String(Math.abs(desvioDiario) % 60).padStart(2, '0')}m`;
        
        if (desvioDiario > 0) { diasCompletos++; } else { diasIncompletos++; }
      }
    } else {
      saldoMinutosCompleto += totalCompensadoNoDia;
      if (totalCompensadoNoDia > 0) {
        textoSaldo = `+ ${Math.floor(totalCompensadoNoDia / 60)}h ${String(totalCompensadoNoDia % 60).padStart(2, '0')}m`;
      }
      diasCompletos++;
    }

    linhasParaImpressao[dataStr] = {
      dataObjeto: data,
      batidas: horarios.map(h => h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })),
      trabalhado: minutosTrabalhadosNoDia,
      abono: minutosAtestadoDoDia,
      saldoTexto: textoSaldo
    };
  });

  // 2. PROCESSAR DIAS QUE SÓ TIVERAM ATESTADO (SEM PONTO FÍSICO)
  diasComAtestado.forEach(dataStr => {
    if (!diasUnicos.has(dataStr)) {
      const partes = colaborador.pontos.find(p => p.dataHora.toISOString().split('T')[0] === dataStr)?.tipo.split(": ");
      const minsAtestado = partes ? Number(partes[1] || 0) : 0;

      const data = new Date(`${dataStr}T12:00:00`);
      const ehDiaUtil = data.getDay() >= 1 && data.getDay() <= 5;
      let textoSaldo = "0h 00m";

      if (ehDiaUtil) {
        const desvioDiario = minsAtestado - MINUTOS_ESPERADOS_POR_DIA;

        if (Math.abs(desvioDiario) <= TOLERANCIA_CLT_MINUTOS) {
          saldoMinutosCompleto += 0;
          diasCompletos++;
        } else {
          saldoMinutosCompleto += desvioDiario;
          textoSaldo = desvioDiario > 0 
            ? `+ ${Math.floor(desvioDiario / 60)}h ${String(desvioDiario % 60).padStart(2, '0')}m` 
            : `- ${Math.floor(Math.abs(desvioDiario) / 60)}h ${String(Math.abs(desvioDiario) % 60).padStart(2, '0')}m`;
          if (desvioDiario > 0) { diasCompletos++; } else { diasIncompletos++; }
        }
      } else {
        saldoMinutosCompleto += minsAtestado;
        if (minsAtestado > 0) {
          textoSaldo = `+ ${Math.floor(minsAtestado / 60)}h ${String(minsAtestado % 60).padStart(2, '0')}m`;
        }
        diasCompletos++;
      }

      linhasParaImpressao[dataStr] = {
        dataObjeto: data,
        batidas: [],
        trabalhado: 0,
        abono: minsAtestado,
        saldoTexto: textoSaldo
      };
    }
  });

  const totalDiasAtestado = diasComAtestado.size;
  const totalMinutosComputados = totalMinutosTrabalhadosReais + totalMinutosAtestado;
  const totalDiasTrabalhados = diasAtivosNoMes.size; // Total de dias com movimentação
  const isPositivo = saldoMinutosCompleto >= 0;

  const formatarMinutos = (minutosTotais: number) => {
    const hrs = Math.floor(minutosTotais / 60);
    const mins = minutosTotais = minutosTotais % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  const formatarMesAnoCabecalho = (mesAnoStr: string) => {
    const [ano, mes] = mesAnoStr.split("-");
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const saldoFormatado = formatarMinutos(Math.abs(saldoMinutosCompleto));
  const jornadasOrdenadas = Object.values(linhasParaImpressao).sort((a, b) => a.dataObjeto.getTime() - b.dataObjeto.getTime());

  return (
    <>
      {/* ---------------- INTERFACE DO SISTEMA (SOME NA IMPRESSÃO) ---------------- */}
      <main className="p-8 max-w-5xl m-auto text-gray-700 print:hidden">
        {/* Topo / Filtro */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-center lg:text-left text-gray-800">Espelho de Ponto Individual</h1>
            <p className="text-sm text-gray-500 mt-1">Gestão de assiduidade, abonos médicos e banco de horas</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <BotaoImprimir />
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
              saldoMinutosCompleto === 0 ? 'bg-blue-50 border-blue-200 text-blue-800' :
              isPositivo ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider text-center">Saldo Atual do Banco de Horas</span>
              <span className="text-3xl font-extrabold mt-2">
                {saldoMinutosCompleto === 0 ? '0h 00m' : isPositivo ? `+ ${saldoFormatado}` : `- ${saldoFormatado}`}
              </span>
              <span className="text-[11px] font-medium mt-1 text-center">
                {saldoMinutosCompleto === 0 ? 'Jornadas estritas ou dentro da tolerância legal' : 
                 isPositivo ? 'Crédito acumulado para o colaborador' : 'Horas em débito (A regularizar)'}
              </span>
            </div>
          </div>
        </div>

        {/* PAINEL DE METRICAS */}
        <h2 className="text-xl font-bold mb-1 text-gray-800">Indicadores de Frequência do Mês</h2>
        <p className="text-xs text-gray-500 mb-4">Métricas calculadas com base na jornada diária padrão de 8h 30m nos dias úteis movimentados.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-emerald-500">
            <span className="text-xs font-bold text-emerald-700 uppercase block">Dias Trabalhados</span>
            <span className="text-xl font-bold text-emerald-600 block mt-1">{totalDiasTrabalhados} dias</span>
            <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight">Dias com registros de ponto ou abonos</span>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-bold text-purple-700 uppercase block">Horas Abonadas</span>
            <span className="text-xl font-bold text-purple-600 block mt-1">{formatarMinutos(totalMinutosAtestado)}</span>
            <span className="text-[11px] text-purple-500 block mt-0.5 leading-tight">Justificado por atestados médicos ({totalDiasAtestado} dia(s)).</span>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-bold text-blue-700 uppercase block">Jornadas Cumpridas</span>
            <span className="text-xl font-bold text-blue-600 block mt-1">{diasCompletos} dias</span>
            <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight">Meta atingida (com tolerância CLT).</span>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-bold text-orange-700 uppercase block">Jornadas Incompletas</span>
            <span className="text-xl font-bold text-orange-600 block mt-1">{diasIncompletos} dias</span>
            <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight">Dias úteis que fecharam abaixo da meta diária.</span>
          </div>
        </div>

        <TabelaHistoricoPonto
          pontosIniciais={colaborador.pontos}
          nomeColaborador={colaborador.nome}
        />
      </main>

      {/* ---------------- ESPELHO DE IMPRESSÃO OFICIAL (APENAS VISÍVEL NO CONTEXTO DE IMPRESSÃO) ---------------- */}
      <div className="hidden print:block w-full text-black bg-white font-sans p-4 text-[11px]">
        
        {/* Cabeçalho Corporativo */}
        <div className="border border-black p-3 text-center mb-4">
          <h1 className="text-base font-bold uppercase tracking-wide">Goiânia Acrílico Ltda</h1>
          <p className="text-[9px] font-mono text-gray-600">CNPJ: 23.650.001/0001-87 — Goiânia - GO</p>
          <div className="mt-2 bg-gray-100 border-t border-b border-black py-1 font-bold text-xs">
            ESPELHO DO REGISTRO DE PONTO — PERÍODO: {formatarMesAnoCabecalho(mesInicialValue)}
          </div>
        </div>

        {/* Informações Funcionais */}
        <div className="grid grid-cols-3 border border-black mb-4 text-[10px]">
          <div className="p-1.5 border-r border-b border-black"><strong>Funcionário:</strong> {colaborador.nome}</div>
          <div className="p-1.5 border-r border-b border-black"><strong>CPF:</strong> {colaborador.cpf}</div>
          <div className="p-1.5 border-b border-black"><strong>Cargo:</strong> {colaborador.cargo}</div>
          <div className="p-1.5 border-r border-black"><strong>Jornada Diária Padrão:</strong> 08h 30m (Dias Úteis)</div>
          <div className="p-1.5 border-r border-black"><strong>Regra Geral:</strong> Art. 58 da CLT (Tolerância 10 min)</div>
          <div className="p-1.5"><strong>Emissão do Laudo:</strong> Portaria MTE 671</div>
        </div>

        {/* Tabela do Histórico Consolidado */}
        <table className="w-full border-collapse border border-black text-[10px] mb-4">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black">
              <th className="border-r border-black p-1 text-center w-20">Data / Dia</th>
              <th className="border-r border-black p-1 text-left pl-2">Pontos Registrados</th>
              <th className="border-r border-black p-1 text-center w-20">Trabalhado</th>
              <th className="border-r border-black p-1 text-center w-16">Abono</th>
              <th className="p-1 text-center w-24">Saldo Líquido</th>
            </tr>
          </thead>
          <tbody>
            {jornadasOrdenadas.map((j) => (
              <tr key={j.dataObjeto.toISOString()} className="border-b border-black">
                <td className="border-r border-black p-1 text-center font-medium">
                  {j.dataObjeto.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {j.dataObjeto.toLocaleDateString('pt-BR', { weekday: 'short' })}
                </td>
                <td className="border-r border-black p-1 pl-2 font-mono tracking-wider">
                  {j.batidas.length > 0 ? j.batidas.join('   |   ') : (j.abono > 0 ? `[ATESTADO MÉDICO: ${formatarMinutos(j.abono)}]` : '-')}
                </td>
                <td className="border-r border-black p-1 text-center font-mono">{formatarMinutos(j.trabalhado)}</td>
                <td className="border-r border-black p-1 text-center font-mono">{j.abono > 0 ? formatarMinutos(j.abono) : '-'}</td>
                <td className="p-1 text-center font-mono font-bold">{j.saldoTexto}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Metrificação Geral Otimizada com Dias Trabalhados */}
        <div className="border border-black p-2 bg-gray-50/50 mb-8 text-[10px]">
          <h3 className="font-bold uppercase border-b border-black pb-0.5 mb-1.5 text-gray-700">Resumo Acumulado do Período</h3>
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div>
              <span className="text-[9px] font-sans block text-gray-500">Dias Ativos / Trabalhados:</span>
              <strong className="text-sm">{totalDiasTrabalhados} dia(s)</strong>
            </div>
            <div>
              <span className="text-[9px] font-sans block text-gray-500">Horas Trabalhadas (Físico):</span>
              <strong className="text-sm">{formatarMinutos(totalMinutosTrabalhadosReais)}</strong>
            </div>
            <div>
              <span className="text-[9px] font-sans block text-gray-500">Total de Horas Abonadas:</span>
              <strong className="text-sm">{formatarMinutos(totalMinutosAtestado)}</strong>
            </div>
            <div>
              <span className="text-[9px] font-sans block text-gray-500">Saldo Líquido do Banco:</span>
              <strong className="text-sm">
                {saldoMinutosCompleto === 0 ? '0h 00m' : isPositivo ? `+ ${saldoFormatado}` : `- ${saldoFormatado}`}
              </strong>
            </div>
          </div>
        </div>

        {/* Campos Legais de Assinatura */}
        <div className="mt-12 grid grid-cols-2 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-black my-1"></div>
            <span className="font-bold">{colaborador.nome}</span>
            <span className="text-[9px] text-gray-500">Assinatura do Funcionário</span>
            <span className="text-[9px] text-gray-400 mt-1">Data: ____/____/_______</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-full border-t border-black my-1"></div>
            <span className="font-bold">Goiânia Acrílico Ltda</span>
            <span className="text-[9px] text-gray-500">Assinatura do Empregador / RH</span>
            <span className="text-[9px] text-gray-400 mt-1">Data: ____/____/_______</span>
          </div>
        </div>

        {/* Termo de Anuência da CLT */}
        <p className="text-[8px] text-gray-400 text-justify mt-8 leading-snug border-t border-gray-200 pt-2 font-mono">
          As assinaturas acima firmadas atestam a veracidade integral das informações prestadas neste documento, em plena concordância com o banco de horas apurado, servindo de comprovação jurídica perante a fiscalização trabalhista e em conformidade com o Art. 58 da Consolidação das Leis do Trabalho (CLT).
        </p>
      </div>
    </>
  );
}