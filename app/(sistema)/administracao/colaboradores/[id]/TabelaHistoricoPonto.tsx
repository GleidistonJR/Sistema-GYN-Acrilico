"use client";

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import ModalEdicaoPonto from './ModalEdicaoPonto';
import { deletarPonto } from '../actions'; // Ajuste seu import da action deletar

interface Ponto {
  id: number;
  dataHora: string | Date;
  tipo: string;
}

interface TabelaProps {
  pontosIniciais: Ponto[];
  nomeColaborador: string;
}

interface LinhaDiaria {
  dataStr: string;
  dataObjeto: Date;
  batidasFisicas: Ponto[];
  atestados: Ponto[];
  minutosTrabalhados: number;
  minutosAtestado: number;
}

export default function TabelaHistoricoPonto({ pontosIniciais, nomeColaborador }: TabelaProps) {
  const [pontos, setPontos] = useState<Ponto[]>(pontosIniciais);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<any | null>(null);

  const MINUTOS_ESPERADOS_DIARIOS = 510; // 8h 30m
  const TOLERANCIA_CLT = 10;

  const formatarMinutos = (minutosTotais: number) => {
    const hrs = Math.floor(minutosTotais / 60);
    const mins = minutosTotais % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  const handleEditar = (ponto: Ponto) => {
    setPontoSelecionado({
      ...ponto,
      colaborador: { nome: nomeColaborador }
    });
    setIsModalOpen(true);
  };

  const handleDeletar = async (id: number) => {
    if (confirm("Deseja realmente excluir este registro? Essa ação recalculará o banco de horas.")) {
      await deletarPonto(id);
      setPontos(prev => prev.filter(p => p.id !== id));
      window.location.reload();
    }
  };

  // --- LÓGICA DE AGRUPAMENTO DIÁRIO ---
  const mapaDias: { [key: string]: LinhaDiaria } = {};

  pontos.forEach((ponto) => {
    const dataObj = new Date(ponto.dataHora);
    const dataStr = dataObj.toLocaleDateString('sv-SE'); 

    if (!mapaDias[dataStr]) {
      mapaDias[dataStr] = {
        dataStr,
        dataObjeto: dataObj,
        batidasFisicas: [],
        atestados: [],
        minutosTrabalhados: 0,
        minutosAtestado: 0,
      };
    }

    if (ponto.tipo.startsWith("Atestado")) {
      mapaDias[dataStr].atestados.push(ponto);
      const minutos = Number(ponto.tipo.split(": ")[1] || 0);
      mapaDias[dataStr].minutosAtestado += minutos;
    } else {
      mapaDias[dataStr].batidasFisicas.push(ponto);
    }
  });

  const jornadasDiarias = Object.values(mapaDias).sort(
    (a, b) => b.dataObjeto.getTime() - a.dataObjeto.getTime()
  );

  jornadasDiarias.forEach((dia) => {
    dia.batidasFisicas.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    let minutosDoDia = 0;
    for (let i = 0; i < dia.batidasFisicas.length; i += 2) {
      if (dia.batidasFisicas[i + 1]) {
        const entrada = new Date(dia.batidasFisicas[i].dataHora).getTime();
        const saida = new Date(dia.batidasFisicas[i + 1].dataHora).getTime();
        minutosDoDia += Math.floor((saida - entrada) / 1000 / 60);
      }
    }
    dia.minutosTrabalhados = minutosDoDia;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-6">
      <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-700">Espelho de Ponto Diário Estruturado</h2>
          <p className="text-xs text-gray-500">Visão consolidada por dia de trabalho e status de cumprimento da carga horária.</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-gray-600">
          <thead>
            <tr className="bg-gray-100 text-gray-700 font-semibold uppercase text-xs tracking-wider border-b">
              <th className="p-4">Data / Dia</th>
              <th className="p-4">Sequência de Marcações (Batidas)</th>
              <th className="p-4 text-center">Total Computado</th>
              <th className="p-4 text-center">Status da Jornada</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {jornadasDiarias.length > 0 ? (
              jornadasDiarias.map((dia) => {
                const totalCompensado = dia.minutosTrabalhados + dia.minutosAtestado;
                const diaDaSemana = dia.dataObjeto.getDay();
                const ehDiaUtil = diaDaSemana >= 1 && diaDaSemana <= 5;
                const desvio = totalCompensado - MINUTOS_ESPERADOS_DIARIOS;

                // Definição das Tags de Status atualizadas
                let tagStatus = { texto: "Fim de Semana", classe: "bg-gray-100 text-gray-600 border border-gray-200" };

                if (ehDiaUtil) {
                  if (Math.abs(desvio) <= TOLERANCIA_CLT) {
                    tagStatus = { texto: "Jornada Completa", classe: "bg-blue-50 text-blue-700 border border-blue-200" };
                  } else if (desvio > TOLERANCIA_CLT) {
                    tagStatus = { texto: `H. Extra (+${formatarMinutos(desvio)})`, classe: "bg-green-50 text-green-700 border border-green-200" };
                  } else {
                    tagStatus = { texto: `Incompleta (${formatarMinutos(Math.abs(desvio))})`, classe: "bg-red-50 text-red-700 border border-red-200" };
                  }
                }

                if (dia.atestados.length > 0 && totalCompensado >= MINUTOS_ESPERADOS_DIARIOS) {
                  tagStatus = { texto: "Abonado pelo Art. 58", classe: "bg-purple-50 text-purple-700 border border-purple-200" };
                }

                return (
                  <tr key={dia.dataStr} className="border-b hover:bg-gray-50/70 transition-colors">
                    {/* COLUNA 1: DATA */}
                    <td className="p-4 font-medium text-gray-900 whitespace-nowrap">
                      {dia.dataObjeto.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <span className="text-xs text-gray-400 block font-normal">
                        {dia.dataObjeto.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </span>
                    </td>

                    {/* COLUNA 2: SEQUÊNCIA DE BATIDAS */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {dia.batidasFisicas.map((ponto, idx) => {
                          const horaFormatada = new Date(ponto.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                          const ehEntrada = idx % 2 === 0;

                          return (
                            <div key={ponto.id} className="flex items-center gap-1 bg-white border rounded shadow-sm px-2 py-1 group">
                              <span className={`w-1.5 h-1.5 rounded-full ${ehEntrada ? 'bg-green-500' : 'bg-orange-500'}`} title={ehEntrada ? "Entrada" : "Saída"} />
                              <span className="font-mono text-xs text-gray-800">{horaFormatada}</span>
                              
                              <div className="flex items-center gap-0.5 ml-2 border-l pl-1 text-gray-400">
                                <button onClick={() => handleEditar(ponto)} title="Editar batida" className="hover:text-amber-600 p-0.5 transition-colors">
                                  <Pencil size={11} />
                                </button>
                                <button onClick={() => handleDeletar(ponto.id)} title="Excluir batida" className="hover:text-red-600 p-0.5 transition-colors">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* MUDANÇA AQUI: Adicionado suporte à edição no mapeamento dos Atestados */}
                        {dia.atestados.map((atestado) => (
                          <div key={atestado.id} className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded px-2 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span className="text-xs font-medium text-purple-700">Médico: {formatarMinutos(Number(atestado.tipo.split(": ")[1] || 0))}</span>
                            
                            <div className="flex items-center gap-0.5 ml-2 border-l border-purple-200 pl-1 text-purple-400">
                              <button onClick={() => handleEditar(atestado)} title="Editar abono" className="hover:text-amber-600 p-0.5 transition-colors">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => handleDeletar(atestado.id)} title="Remover abono" className="hover:text-red-600 p-0.5 transition-colors">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {dia.batidasFisicas.length === 0 && dia.atestados.length === 0 && (
                          <span className="text-xs italic text-gray-400 font-normal">Sem marcações registradas</span>
                        )}

                        {dia.batidasFisicas.length % 2 !== 0 && (
                          <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded animate-pulse font-medium">
                            Falta Saída
                          </span>
                        )}
                      </div>
                    </td>

                    {/* COLUNA 3: TOTAL DE HORAS */}
                    <td className="p-4 text-center font-semibold font-mono text-gray-800 whitespace-nowrap">
                      {formatarMinutos(totalCompensado)}
                      {dia.minutosAtestado > 0 && (
                        <span className="text-[10px] text-purple-500 font-sans block font-normal">
                          (Físico: {formatarMinutos(dia.minutosTrabalhados)})
                        </span>
                      )}
                    </td>

                    {/* COLUNA 4: TAG DE STATUS */}
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${tagStatus.classe}`}>
                        {tagStatus.texto}
                      </span>
                    </td>

                    {/* COLUNA 5: AÇÕES COMPLEMENTARES */}
                    <td className="p-4 text-center text-gray-400 text-xs italic">
                      Gerenciado nas batidas
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                  Nenhum registro encontrado para este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ModalEdicaoPonto 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dadosEdicao={pontoSelecionado}
      />
    </div>
  );
}