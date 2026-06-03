"use client";

import { useState } from 'react';
import { Pencil, Trash2, CalendarDays, FilePlus2 } from 'lucide-react';
import ModalEdicaoPonto from './ModalEdicaoPonto';
// Importando a sua action que gerencia o FormData do modal
import { deletarPonto, criarFeriado, adicionarAtestado } from '../actions'; 

interface Ponto {
  id: number;
  dataHora: string | Date;
  tipo: string;
}

interface TabelaProps {
  pontosIniciais: Ponto[];
  nomeColaborador: string;
  colaboradorId: number; 
}

interface LinhaDiaria {
  dataStr: string;
  dataObjeto: Date;
  batidasFisicas: Ponto[];
  atestados: Ponto[];
  feriados: Ponto[];
  minutosTrabalhados: number;
  minutosAtestado: number;
}

export default function TabelaHistoricoPonto({ pontosIniciais, nomeColaborador, colaboradorId }: TabelaProps) {
  const [pontos, setPontos] = useState<Ponto[]>(pontosIniciais);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<any | null>(null);

  // ESTADOS PARA O SEU MODAL DE ATESTADO
  const [isAtestadoOpen, setIsAtestadoOpen] = useState(false);
  const [isAtestadoPending, setIsAtestadoPending] = useState(false);
  const [dataAtestadoSelecionada, setDataAtestadoSelecionada] = useState("");

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

  const handleMarcarFeriado = async (dataStr: string) => {
    const dataFormatadaBR = dataStr.split('-').reverse().join('/');
    if (confirm(`Deseja marcar o dia ${dataFormatadaBR} como Feriado/Recesso?`)) {
      try {
        await criarFeriado(colaboradorId, dataStr);
        window.location.reload(); 
      } catch (err) {
        alert("Erro ao salvar feriado no banco de dados.");
      }
    }
  };

  // ABRE O SEU MODAL CAPTURANDO A DATA DA LINHA CLICADA
  const handleAbrirModalAtestado = (dataStr: string) => {
    setDataAtestadoSelecionada(dataStr);
    setIsAtestadoOpen(true);
  };

  // SUBMIT DO SEU MODAL ADAPTADO PARA A LINHA
  async function handleAtestadoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAtestadoPending(true);

    const formData = new FormData(event.currentTarget);
    const horas = Number(formData.get("horas_input"));
    const minutos = Number(formData.get("minutos_input"));
    
    formData.append("colaboradorId", colaboradorId.toString());
    formData.append("horas", horas.toString());
    formData.append("minutos", minutos.toString());

    try {
      await adicionarAtestado(formData);
      setIsAtestadoOpen(false);
      window.location.reload(); // Recarrega a página para atualizar o espelho
    } catch (error) {
      alert("Erro ao salvar atestado");
    } finally {
      setIsAtestadoPending(false);
    }
  }

  // --- LÓGICA DE AGRUPAMENTO DIÁRIO COM CALENDÁRIO COMPLETO ---
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
        feriados: [],
        minutosTrabalhados: 0,
        minutosAtestado: 0,
      };
    }

    if (ponto.tipo.startsWith("Atestado")) {
      mapaDias[dataStr].atestados.push(ponto);
      const minutos = Number(ponto.tipo.split(": ")[1] || 0);
      mapaDias[dataStr].minutosAtestado += minutos;
    } else if (ponto.tipo === "Feriado") {
      mapaDias[dataStr].feriados.push(ponto);
    } else {
      mapaDias[dataStr].batidasFisicas.push(ponto);
    }
  });

  let listaDatasOrdenadas: LinhaDiaria[] = [];

  if (pontos.length > 0) {
    const dataBase = new Date(pontos[0].dataHora);
    const ano = dataBase.getFullYear();
    const mes = dataBase.getMonth();

    const primeiroDiaDoMes = new Date(ano, mes, 1);
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0);

    for (let d = primeiroDiaDoMes.getDate(); d <= ultimoDiaDoMes.getDate(); d++) {
      const dataCorrente = new Date(ano, mes, d, 12, 0, 0);
      const stringData = dataCorrente.toLocaleDateString('sv-SE');

      if (!mapaDias[stringData]) {
        mapaDias[stringData] = {
          dataStr: stringData,
          dataObjeto: dataCorrente,
          batidasFisicas: [],
          atestados: [],
          feriados: [],
          minutosTrabalhados: 0,
          minutosAtestado: 0,
        };
      }
    }
    
    listaDatasOrdenadas = Object.values(mapaDias).sort(
      (a, b) => b.dataObjeto.getTime() - a.dataObjeto.getTime()
    );
  }

  listaDatasOrdenadas.forEach((dia) => {
    dia.batidasFisicas.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    let minutesDoDia = 0;
    for (let i = 0; i < dia.batidasFisicas.length; i += 2) {
      if (dia.batidasFisicas[i + 1]) {
        const entrada = new Date(dia.batidasFisicas[i].dataHora).getTime();
        const saida = new Date(dia.batidasFisicas[i + 1].dataHora).getTime();
        minutesDoDia += Math.floor((saida - entrada) / 1000 / 60);
      }
    }
    dia.minutosTrabalhados = minutesDoDia;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-6">
      <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-700">Espelho de Ponto Diário Estruturado</h2>
          <p className="text-xs text-gray-500">Visão consolidada do calendário incluindo faltas, folgas semanais e feriados.</p>
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
              <th className="p-4 text-center">Ações Em Bloco</th>
            </tr>
          </thead>
          <tbody>
            {listaDatasOrdenadas.length > 0 ? (
              listaDatasOrdenadas.map((dia) => {
                const totalCompensado = dia.minutosTrabalhados + dia.minutosAtestado;
                const diaDaSemana = dia.dataObjeto.getDay();
                const ehDiaUtil = diaDaSemana >= 1 && diaDaSemana <= 5;
                const desvio = totalCompensado - MINUTOS_ESPERADOS_DIARIOS;

                const temRegistroValido = dia.batidasFisicas.length > 0 || dia.atestados.length > 0 || dia.feriados.length > 0;

                let tagStatus = { texto: "Fim de Semana", classe: "bg-gray-100 text-gray-600 border border-gray-200" };

                if (ehDiaUtil) {
                  if (!temRegistroValido) {
                    tagStatus = { texto: "Falta Sem Justificativa", classe: "bg-red-100 text-red-700 border border-red-300 font-bold" };
                  } else if (dia.feriados.length > 0) {
                    tagStatus = { texto: "Feriado / Recesso", classe: "bg-amber-100 text-amber-800 border border-amber-300 font-semibold" };
                  } else {
                    if (Math.abs(desvio) <= TOLERANCIA_CLT) {
                      tagStatus = { texto: "Jornada Completa", classe: "bg-blue-50 text-blue-700 border border-blue-200" };
                    } else if (desvio > TOLERANCIA_CLT) {
                      tagStatus = { texto: `H. Extra (+${formatarMinutos(desvio)})`, classe: "bg-green-50 text-green-700 border border-green-200" };
                    } else {
                      tagStatus = { texto: `Incompleta (${formatarMinutos(Math.abs(desvio))})`, classe: "bg-red-50 text-red-700 border border-red-200" };
                    }
                  }
                } else {
                  if (dia.feriados.length > 0) {
                    tagStatus = { texto: "Feriado no FDS", classe: "bg-amber-100 text-amber-800 border border-amber-300" };
                  } else if (totalCompensado > 0) {
                    tagStatus = { texto: `H. Extra FDS (+${formatarMinutos(totalCompensado)})`, classe: "bg-green-50 text-green-700 border border-green-200" };
                  }
                }

                if (dia.atestados.length > 0 && totalCompensado >= MINUTOS_ESPERADOS_DIARIOS) {
                  tagStatus = { texto: "Abonado pelo Art. 58", classe: "bg-purple-50 text-purple-700 border border-purple-200" };
                }

                const ehFaltaMeioSemana = ehDiaUtil && tagStatus.texto === "Falta Sem Justificativa";
                const ehIncompletoMeioSemana = ehDiaUtil && tagStatus.texto.startsWith("Incompleta");

                return (
                  <tr key={dia.dataStr} className="border-b hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-medium text-gray-900 whitespace-nowrap">
                      {dia.dataObjeto.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <span className="text-xs text-gray-400 block font-normal">
                        {dia.dataObjeto.toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </span>
                    </td>

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

                        {dia.feriados.map((feriado) => (
                          <div key={feriado.id} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            <CalendarDays size={12} className="text-amber-600" />
                            <span className="text-xs font-medium text-amber-800">Calendário Oficial de Feriados</span>
                            <button onClick={() => handleDeletar(feriado.id)} title="Remover Feriado" className="ml-1.5 text-amber-400 hover:text-red-600 transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}

                        {!temRegistroValido && (
                          <span className="text-xs italic text-gray-400 font-normal">Sem movimentações no ponto</span>
                        )}

                        {dia.batidasFisicas.length % 2 !== 0 && (
                          <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded animate-pulse font-medium">
                            Falta Saída
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center font-semibold font-mono text-gray-800 whitespace-nowrap">
                      {dia.feriados.length > 0 ? "0h 00m" : formatarMinutos(totalCompensado)}
                      {dia.minutosAtestado > 0 && (
                        <span className="text-[10px] text-purple-500 font-sans block font-normal">
                          (Físico: {formatarMinutos(dia.minutosTrabalhados)})
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${tagStatus.classe}`}>
                        {tagStatus.texto}
                      </span>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {ehFaltaMeioSemana && (
                          <button
                            onClick={() => handleMarcarFeriado(dia.dataStr)}
                            className="text-[11px] bg-white hover:bg-amber-50 text-gray-600 hover:text-amber-800 border border-gray-200 hover:border-amber-300 px-2 py-1 rounded transition-all font-medium flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <CalendarDays size={12} /> + Feriado
                          </button>
                        )}

                        {/* DISPARA A ABERTURA DO MODAL PASSANDO A DATA CORRETA */}
                        {(ehFaltaMeioSemana || ehIncompletoMeioSemana) && (
                          <button
                            onClick={() => handleAbrirModalAtestado(dia.dataStr)}
                            className="text-[11px] bg-white hover:bg-purple-50 text-gray-600 hover:text-purple-800 border border-gray-200 hover:border-purple-300 px-2 py-1 rounded transition-all font-medium flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <FilePlus2 size={12} /> + Atestado
                          </button>
                        )}

                        {!ehFaltaMeioSemana && !ehIncompletoMeioSemana && (
                          <span className="text-gray-400 text-xs italic">
                            {!ehDiaUtil ? "Fim de Semana" : "Jornada Regular"}
                          </span>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                  Nenhum registro mapeado para montar o calendário.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDIÇÃO DE PONTO TRADICIONAL */}
      <ModalEdicaoPonto 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dadosEdicao={pontoSelecionado}
      />

      {/* ========================================================== */}
      {/* SEU MODAL DE ATESTADO COM ESTILO INTERNO ATUALIZADO         */}
      {/* ========================================================== */}
      {isAtestadoOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-700 text-lg">Lançar Atestado / Abono</h3>
              <button 
                onClick={() => setIsAtestadoOpen(false)} 
                className="text-gray-400 hover:text-gray-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAtestadoSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Data do Afastamento</label>
                <input 
                  type="date" 
                  name="data" 
                  value={dataAtestadoSelecionada}
                  readOnly // Mantém travado na data em que ele clicou na tabela
                  required 
                  className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Horas Abonadas</label>
                  <input 
                    type="number" 
                    name="horas_input" 
                    min="0" 
                    max="23" 
                    defaultValue="8" 
                    required
                    className="w-full border rounded-lg p-2 bg-gray-50 focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Minutos Abonados</label>
                  <input 
                    type="number" 
                    name="minutos_input" 
                    min="0" 
                    max="59" 
                    defaultValue="30" 
                    required
                    className="w-full border rounded-lg p-2 bg-gray-50 focus:outline-blue-500"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 italic">
                O tempo preenchido será somado como crédito para abater as horas em falta do colaborador neste dia específico.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAtestadoOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isAtestadoPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  disabled={isAtestadoPending}
                >
                  {isAtestadoPending ? "Salvando..." : "Confirmar e Abater"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}