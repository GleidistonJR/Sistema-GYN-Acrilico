"use client";

import { useState } from "react";
import { LinhaRelatorio } from "./page";
import BotaoImprimir from "./BotaoImprimir";
import ModalCriarPonto from "./ModalCriarPonto";
import ModalAtestado from "./ModalAtestado";
import TabelaHistoricoPonto from "./TabelaHistoricoPonto";

interface PainelProps {
  role: string;
  colaborador: any;
  linhasParaImpressao: LinhaRelatorio[];
  diasUteisIniciais: number;
  mesInicialValue: string;
}

export default function PainelPerfil({
  role,
  colaborador,
  linhasParaImpressao,
  diasUteisIniciais,
  mesInicialValue
}: PainelProps) {

  const [diasConsiderados, setDiasConsiderados] = useState<number>(diasUteisIniciais || 21);

  const MINUTOS_JORNADA_DIARIA = 8 * 60 + 30; // 510 minutos (8h30m)
  const TOLERANCIA_CLT = 10;

  // Função interna para formatar o cabeçalho de impressão
  const formatarMesAnoCabecalho = (mesAnoStr: string) => {
    if (!mesAnoStr) return "";
    const [ano, mes] = mesAnoStr.split("-");
    const d = new Date(Number(ano), Number(mes) - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  // Obter data de hoje sem considerar a hora para comparação precisa
  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  let totalMinutosTrabalhados = 0;
  let totalMinutosAtestado = 0;
  let qtdDiasFaltas = 0;
  let qtdDiasJustificados = 0;

  // Variáveis para o cálculo inteligente do saldo real (até o dia de hoje)
  let saldoAcumuladoAteHoje = 0;
  let diasUteisCalculadosAteHoje = 0;

  linhasParaImpressao.forEach(linha => {
    totalMinutosTrabalhados += linha.trabalhado;
    totalMinutosAtestado += linha.abono;

    if (linha.statusDia === "FALTA") {
      qtdDiasFaltas++;
    }
    if (linha.statusDia === "TRABALHADO" || linha.statusDia === "ATESTADO") {
      qtdDiasJustificados++;
    }

    // --- CÁLCULO INTELIGENTE DO SALDO REAL ---
    const dataLinha = new Date(linha.dataObjeto);
    const dataLinhaSemHora = new Date(dataLinha.getFullYear(), dataLinha.getMonth(), dataLinha.getDate());

    // Só processa para o saldo se for hoje ou um dia que já passou
    if (dataLinhaSemHora <= hojeSemHora) {
      if (linha.statusDia !== "FOLGA" && linha.statusDia !== "FERIADO") {
        diasUteisCalculadosAteHoje++;

        const totalCompensadoDia = linha.trabalhado + linha.abono;
        const desvioDia = totalCompensadoDia - MINUTOS_JORNADA_DIARIA;

        // Se o desvio do dia for maior que a tolerância (ex: +11min ou -11min), acumula o saldo real
        if (Math.abs(desvioDia) > TOLERANCIA_CLT) {
          saldoAcumuladoAteHoje += desvioDia;
        }
        // Caso contrário (desvio de até 10min), o saldo do dia é considerado ZERO (Jornada Completa)
      } else if ((linha.statusDia === "FERIADO" || linha.statusDia === "FOLGA") && linha.trabalhado > 0) {
        // Se trabalhou em folga/feriado, todo o tempo trabalhado vira saldo positivo direto
        saldoAcumuladoAteHoje += linha.trabalhado;
      }
    }
  });

  const totalMinutosEsperadosNoMes = diasConsiderados * MINUTOS_JORNADA_DIARIA;

  // O saldo final agora herda a soma dos desvios diários que estouraram a tolerância
  const saldoMinutosCompleto = saldoAcumuladoAteHoje;
  const isPositivo = saldoMinutosCompleto >= 0;

  const formatarMinutos = (minutosTotais: number) => {
    const hrs = Math.floor(minutosTotais / 60);
    const mins = minutosTotais % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  const saldoFormatado = formatarMinutos(Math.abs(saldoMinutosCompleto));

  const linhasComSaldoCalculado = linhasParaImpressao.map(linha => {
    let textoSaldo = "0h 00m";

    if (linha.statusDia !== "FERIADO" && linha.statusDia !== "FOLGA") {
      const totalCompensado = linha.trabalhado + linha.abono;
      const desvio = totalCompensado - MINUTOS_JORNADA_DIARIA;

      // Exibe o saldo na tabela apenas se passar da tolerância diária de 10 min
      if (Math.abs(desvio) > TOLERANCIA_CLT) {
        const hrs = Math.floor(Math.abs(desvio) / 60);
        const mins = Math.abs(desvio) % 60;
        textoSaldo = `${desvio > 0 ? "+" : "-"} ${hrs}h ${mins.toString().padStart(2, '0')}m`;
      }
    } else if ((linha.statusDia === "FERIADO" || linha.statusDia === "FOLGA") && linha.trabalhado > 0) {
      const hrs = Math.floor(linha.trabalhado / 60);
      const mins = linha.trabalhado % 60;
      textoSaldo = `+ ${hrs}h ${mins.toString().padStart(2, '0')}m`;
    }

    return { ...linha, saldoTexto: textoSaldo };
  });

  return (
    <>
      {/* ---------------- INTERFACE DO SISTEMA ---------------- */}
      <div className="bg-surface-hover">
        <section className="bg-surface p-4 sm:p-10 w-full max-w-5xl xl:max-w-3/4 mx-auto text-secondary print:hidden">
          <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4 border-b pb-4">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatorio de Pontos</h1>
              <p className="text-sm text-muted mt-1">Gestão de assiduidade, abonos médicos e banco de horas</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
              {role === "ADMIN" &&
                <BotaoImprimir />
              }
              <form method="GET" className="flex flex-wrap items-center gap-2 bg-surface p-2 rounded-lg border shadow-sm w-full sm:w-auto justify-center">
                <label htmlFor="mes" className="text-xs font-semibold uppercase text-muted tracking-wider pl-1">Período:</label>
                <input
                  type="month"
                  id="mes"
                  name="mes"
                  defaultValue={mesInicialValue}
                  className="min-w-0 max-w-full border rounded px-2 py-2 sm:py-1 text-sm bg-surface-soft focus:outline-blue-500"
                />
                <button type="submit" className="min-h-11 sm:min-h-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 sm:py-1 rounded transition-colors">
                  Buscar
                </button>
              </form>
            </div>
          </div>
          <p className="text-xl sm:text-2xl break-words font-bold text-foreground text-center mb-5">{colaborador.nome}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <div className="min-w-0 break-words bg-surface p-4 sm:p-6 rounded-xl shadow-sm border md:col-span-1">
              <h2 className="text-xs font-bold mb-3 border-b pb-2 text-subtle uppercase tracking-wider">Dados do Contrato</h2>
              <p className="mb-1.5 text-sm"><strong>Nome:</strong> {colaborador.nome}</p>
              <p className="mb-1.5 text-sm"><strong>Cargo:</strong> {colaborador.cargo}</p>
              <p className="mb-1.5 text-sm"><strong>CPF:</strong> {colaborador.cpf}</p>
              <p className="text-sm"><strong>Salário Base:</strong> {colaborador.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-sm border md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-info-soft/50 p-4 rounded-lg flex flex-col justify-center items-center border border-info-line">
                <span className="text-xs font-bold uppercase text-info-ink tracking-wider text-center">Horas Esperadas no Período</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-info-ink mt-2">{formatarMinutos(totalMinutosEsperadosNoMes)}</span>
                <span className="text-[11px] text-info-ink text-center mt-1">Carga calculada para {diasConsiderados} dias úteis</span>
              </div>
              <div className={`p-4 rounded-lg flex flex-col justify-center items-center border transition-colors ${saldoMinutosCompleto === 0 ? 'bg-info-soft border-info-line text-info-ink' :
                isPositivo ? 'bg-success-soft border-success-line text-success-ink' : 'bg-danger-soft border-danger-line text-danger-ink'
                }`}>
                <span className="text-xs font-bold uppercase tracking-wider text-center">Saldo Real do Banco de Horas</span>
                <span className="text-2xl sm:text-3xl font-extrabold mt-2">
                  {saldoMinutosCompleto === 0 ? '0h 00m' : isPositivo ? `+ ${saldoFormatado}` : `- ${saldoFormatado}`}
                </span>
                <span className="text-[11px] font-medium mt-1 text-center">
                  {saldoMinutosCompleto === 0 ? 'Saldo zerado / em dia' : isPositivo ? 'Crédito acumulado real' : 'Funcionário em débito com a empresa'}
                </span>
              </div>
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-bold mb-3 text-foreground">Indicadores de Frequência do Mês</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface p-4 rounded-xl border shadow-sm border-l-4 border-l-red-500">
              <span className="text-xs font-bold text-danger-ink uppercase block">Dias de Faltas</span>
              <span className="text-2xl font-extrabold text-danger-ink block mt-1">{qtdDiasFaltas} falta(s)</span>
              <span className="text-[13px] text-muted block mt-1 leading-tight">Dias úteis sem ponto ou atestado médico</span>
            </div>
            <div className="bg-surface p-4 rounded-xl border shadow-sm border-l-4 border-l-purple-500">
              <span className="text-xs font-bold text-violet-ink uppercase block">Horas Abonadas</span>
              <span className="text-2xl font-extrabold text-violet-ink block mt-1">{formatarMinutos(totalMinutosAtestado)}</span>
              <span className="text-[13px] text-muted block mt-1 leading-tight">Tempo justificado por atestados médicos</span>
            </div>
            <div className="bg-surface p-4 rounded-xl border shadow-sm border-l-4 border-l-emerald-500">
              <span className="text-xs font-bold text-success-ink uppercase block">Dias Justificados</span>
              <span className="text-2xl font-extrabold text-success-ink block mt-1">{qtdDiasJustificados} dia(s)</span>
              <span className="text-[13px] text-muted block mt-1 leading-tight">Soma de dias trabalhados + dias com atestado</span>
            </div>
          </div>
          <TabelaHistoricoPonto
            pontosIniciais={colaborador.pontos}
            nomeColaborador={colaborador.nome}
            colaboradorId={colaborador.id}
            role={role}
          />
        </section>
      </div>




      {/* ---------------- ESPELHO DE IMPRESSÃO OFICIAL ---------------- */}
      <div className="hidden print:block w-full text-black bg-white font-sans p-4 text-[11px]">
        <div className="border border-black p-3 text-center mb-4">
          <h1 className="text-base font-bold uppercase tracking-wide">Goiânia Acrílico Ltda</h1>
          <p className="text-[9px] font-mono text-secondary">CNPJ: 23.650.001/0001-87 — Goiânia - GO</p>
          <div className="mt-2 bg-surface-muted border-t border-b border-black py-1 font-bold text-xs">
            ESPELHO DO REGISTRO DE PONTO — PERÍODO: {formatarMesAnoCabecalho(mesInicialValue)}
          </div>
        </div>

        <div className="grid grid-cols-3 border border-black mb-4 text-[10px]">
          <div className="p-1.5 border-r border-b border-black"><strong>Funcionário:</strong> {colaborador.nome}</div>
          <div className="p-1.5 border-r border-b border-black"><strong>CPF:</strong> {colaborador.cpf}</div>
          <div className="p-1.5 border-b border-black"><strong>Cargo:</strong> {colaborador.cargo}</div>
          <div className="p-1.5 border-r border-black"><strong>Dias Considerados:</strong> {diasConsiderados} dias úteis</div>
          <div className="p-1.5 border-r border-black"><strong>Carga Esperada:</strong> {formatarMinutos(totalMinutosEsperadosNoMes)}</div>
          <div className="p-1.5"><strong>Regra Geral:</strong> Art. 58 CLT (Tolerância 10 min)</div>
        </div>

        <table className="w-full border-collapse border border-black text-[10px] mb-4">
          <thead>
            <tr className="bg-surface-muted font-bold border-b border-black">
              <th className="border-r border-black p-1 text-center w-20">Data / Dia</th>
              <th className="border-r border-black p-1 text-left pl-2">Pontos Registrados</th>
              <th className="border-r border-black p-1 text-center w-20">Trabalhado</th>
              <th className="border-r border-black p-1 text-center w-16">Abono</th>
              <th className="p-1 text-center w-24">Saldo Líquido</th>
            </tr>
          </thead>
          <tbody>
            {linhasComSaldoCalculado.map((j) => (
              <tr key={j.dataStr} className="border-b border-black">
                <td className="border-r border-black p-1 text-center font-medium">
                  {j.dataObjeto.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {j.dataObjeto.toLocaleDateString('pt-BR', { weekday: 'short' })}
                </td>
                <td className="border-r border-black p-1 pl-2 font-mono tracking-wider text-[9px]">
                  {j.statusDia === "FERIADO" ? (
                    <span className="font-sans font-bold text-secondary">FERIADO / RECESSO OFICIAL</span>
                  ) : j.statusDia === "FALTA" ? (
                    <span className="font-sans font-bold text-danger-ink">FALTA NÃO JUSTIFICADA</span>
                  ) : j.statusDia === "FOLGA" && j.batidas.length === 0 ? (
                    <span className="font-sans text-subtle">SÁBADO / DOMINGO</span>
                  ) : j.batidas.length > 0 ? (
                    j.batidas.join('   |   ')
                  ) : j.abono > 0 ? (
                    `[ATESTADO MÉDICO: ${formatarMinutos(j.abono)}]`
                  ) : (
                    '-'
                  )}
                </td>
                <td className="border-r border-black p-1 text-center font-mono">
                  {j.statusDia === "FERIADO" && j.trabalhado === 0 ? "Feriado" : formatarMinutos(j.trabalhado)}
                </td>
                <td className="border-r border-black p-1 text-center font-mono">
                  {j.abono > 0 ? formatarMinutos(j.abono) : '-'}
                </td>
                <td className="p-1 text-center font-mono font-bold">{j.saldoTexto}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border border-black p-2 bg-surface-soft/50 mb-8 text-[10px]">
          <h3 className="font-bold uppercase border-b border-black pb-0.5 mb-1.5 text-secondary">Resumo Acumulado do Período</h3>
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div>
              <span className="text-[9px] font-sans block text-muted">Dias de Faltas:</span>
              <strong className="text-sm">{qtdDiasFaltas} dia(s)</strong>
            </div>
            <div>
              <span className="text-[9px] font-sans block text-muted">Dias Justificados:</span>
              <strong className="text-sm">{qtdDiasJustificados} dia(s)</strong>
            </div>
            <div>
              <span className="text-[9px] font-sans block text-muted">Total de Horas Abonadas:</span>
              <strong className="text-sm">{formatarMinutos(totalMinutosAtestado)}</strong>
            </div>
            <div>
              <span className="text-[9px] font-sans block text-muted">Saldo Líquido do Banco:</span>
              <strong className="text-sm">
                {saldoMinutosCompleto === 0 ? '0h 00m' : isPositivo ? `+ ${saldoFormatado}` : `- ${saldoFormatado}`}
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-black my-1"></div>
            <span className="font-bold">{colaborador.nome}</span>
            <span className="text-[9px] text-muted">Assinatura do Funcionário</span>
            <span className="text-[9px] text-subtle mt-1">Data: ____/____/_______</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-black my-1"></div>
            <span className="font-bold">Goiânia Acrílico Ltda</span>
            <span className="text-[9px] text-muted">Assinatura do Empregador / RH</span>
            <span className="text-[9px] text-subtle mt-1">Data: ____/____/_______</span>
          </div>
        </div>
      </div>
    </>
  );
}
