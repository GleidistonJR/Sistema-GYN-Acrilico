"use client";

import { useState } from "react";
import { LinhaRelatorio } from "./page";
import BotaoImprimir from "./BotaoImprimir";
import ModalCriarPonto from "./ModalCriarPonto";
import ModalAtestado from "./ModalAtestado";
import TabelaHistoricoPonto from "./TabelaHistoricoPonto";

interface PainelProps {
  colaborador: any;
  linhasParaImpressao: LinhaRelatorio[];
  diasUteisIniciais: number;
  mesInicialValue: string;
}

export default function PainelFrequenciaInterativo({
  colaborador,
  linhasParaImpressao,
  diasUteisIniciais,
  mesInicialValue
}: PainelProps) {
  
  const [diasConsiderados, setDiasConsiderados] = useState<number>(diasUteisIniciais || 21);

  const MINUTOS_JORNADA_DIARIA = 8 * 60 + 30; // 510 minutos (8h30m)
  const TOLERANCIA_CLT = 10;

  // Função interna para formatar o cabeçalho de impressão (Evita o erro de serialização do Next.js)
  const formatarMesAnoCabecalho = (mesAnoStr: string) => {
    if (!mesAnoStr) return "";
    const [ano, mes] = mesAnoStr.split("-");
    const d = new Date(Number(ano), Number(mes) - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  let totalMinutosTrabalhados = 0;
  let totalMinutosAtestado = 0;
  let qtdDiasFaltas = 0;
  let qtdDiasJustificados = 0;

  linhasParaImpressao.forEach(linha => {
    totalMinutosTrabalhados += linha.trabalhado; // Corrigido de line para linha
    totalMinutosAtestado += linha.abono;

    if (linha.statusDia === "FALTA") {
      qtdDiasFaltas++;
    }
    if (linha.statusDia === "TRABALHADO" || linha.statusDia === "ATESTADO") {
      qtdDiasJustificados++;
    }
  });

  const totalMinutosEsperadosNoMes = diasConsiderados * MINUTOS_JORNADA_DIARIA;
  const totalMinutosComputados = totalMinutosTrabalhados + totalMinutosAtestado;
  
  let saldoMinutosCompleto = totalMinutosComputados - totalMinutosEsperadosNoMes;

  if (Math.abs(saldoMinutosCompleto) <= TOLERANCIA_CLT) {
    saldoMinutosCompleto = 0;
  }

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
      const totalCompensadoDia = linha.trabalhado + linha.abono;
      const desvio = totalCompensadoDia - MINUTOS_JORNADA_DIARIA;
      
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
      <main className="p-8 max-w-3/4 m-auto text-gray-700 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-center lg:text-left text-gray-800">Espelho de Ponto Individual</h1>
            <p className="text-sm text-gray-500 mt-1">Gestão de assiduidade, abonos médicos e banco de horas</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <BotaoImprimir />
            
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
              <span className="text-xs font-bold uppercase text-blue-700 tracking-wider text-center">Horas Esperadas no Período</span>
              <span className="text-3xl font-extrabold text-blue-600 mt-2">{formatarMinutos(totalMinutosEsperadosNoMes)}</span>
              <span className="text-[11px] text-blue-500 text-center mt-1">Carga calculada para {diasConsiderados} dias úteis</span>
            </div>

            <div className={`p-4 rounded-lg flex flex-col justify-center items-center border transition-colors ${saldoMinutosCompleto === 0 ? 'bg-blue-50 border-blue-200 text-blue-800' :
              isPositivo ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              <span className="text-xs font-bold uppercase tracking-wider text-center">Saldo Real do Banco de Horas</span>
              <span className="text-3xl font-extrabold mt-2">
                {saldoMinutosCompleto === 0 ? '0h 00m' : isPositivo ? `+ ${saldoFormatado}` : `- ${saldoFormatado}`}
              </span>
              <span className="text-[11px] font-medium mt-1 text-center">
                {isPositivo ? 'Crédito acumulado real' : 'Funcionário em débito com a empresa'}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-1 text-gray-800">Indicadores de Frequência do Mês</h2>
        <p className="text-xs text-gray-500 mb-4">Ajuste os dias úteis esperados abaixo para atualizar o banco de horas instantaneamente.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-amber-800 uppercase block">Dias Considerados</span>
              <span className="text-[11px] text-amber-600 block leading-tight mb-2">Configure os dias úteis da folha</span>
            </div>
            <input
              type="number"
              min="0"
              max="31"
              value={diasConsiderados}
              onChange={(e) => setDiasConsiderados(Number(e.target.value))}
              className="w-full border border-amber-300 rounded px-3 py-1 text-base font-bold text-amber-900 bg-white focus:outline-amber-500"
            />
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-red-500">
            <span className="text-xs font-bold text-red-700 uppercase block">Dias de Faltas</span>
            <span className="text-2xl font-extrabold text-red-600 block mt-1">{qtdDiasFaltas} falta(s)</span>
            <span className="text-[11px] text-gray-400 block mt-1 leading-tight">Dias úteis sem ponto ou atestado médico</span>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-purple-500">
            <span className="text-xs font-bold text-purple-700 uppercase block">Horas Abonadas</span>
            <span className="text-2xl font-extrabold text-purple-600 block mt-1">{formatarMinutos(totalMinutosAtestado)}</span>
            <span className="text-[11px] text-gray-400 block mt-1 leading-tight">Tempo justificado por atestados médicos</span>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-emerald-500">
            <span className="text-xs font-bold text-emerald-700 uppercase block">Dias Justificados</span>
            <span className="text-2xl font-extrabold text-emerald-600 block mt-1">{qtdDiasJustificados} dia(s)</span>
            <span className="text-[11px] text-gray-400 block mt-1 leading-tight">Soma de dias trabalhados + dias com atestado</span>
          </div>
        </div>

        <TabelaHistoricoPonto
          pontosIniciais={colaborador.pontos}
          nomeColaborador={colaborador.nome}
          colaboradorId={colaborador.id}
        />
      </main>

      {/* ---------------- ESPELHO DE IMPRESSÃO OFICIAL ---------------- */}
      <div className="hidden print:block w-full text-black bg-white font-sans p-4 text-[11px]">
        <div className="border border-black p-3 text-center mb-4">
          <h1 className="text-base font-bold uppercase tracking-wide">Goiânia Acrílico Ltda</h1>
          <p className="text-[9px] font-mono text-gray-600">CNPJ: 23.650.001/0001-87 — Goiânia - GO</p>
          <div className="mt-2 bg-gray-100 border-t border-b border-black py-1 font-bold text-xs">
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
            <tr className="bg-gray-100 font-bold border-b border-black">
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
                    <span className="font-sans font-bold text-gray-700">FERIADO / RECESSO OFICIAL</span>
                  ) : j.statusDia === "FALTA" ? (
                    <span className="font-sans font-bold text-red-600">FALTA NÃO JUSTIFICADA</span>
                  ) : j.statusDia === "FOLGA" && j.batidas.length === 0 ? (
                    <span className="font-sans text-gray-400">SÁBADO / DOMINGO</span>
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

        <div className="border border-black p-2 bg-gray-50/50 mb-8 text-[10px]">
          <h3 className="font-bold uppercase border-b border-black pb-0.5 mb-1.5 text-gray-700">Resumo Acumulado do Período</h3>
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div>
              <span className="text-[9px] font-sans block text-gray-500">Dias de Faltas:</span>
              <strong className="text-sm">{qtdDiasFaltas} dia(s)</strong>
            </div>
            <div>
              <span className="text-[9px] font-sans block text-gray-500">Dias Justificados:</span>
              <strong className="text-sm">{qtdDiasJustificados} dia(s)</strong>
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
      </div>
    </>
  );
}