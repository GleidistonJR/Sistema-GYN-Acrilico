"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, CalendarDays, FilePlus2, PlusCircle } from 'lucide-react';
import ModalEdicaoPonto from './ModalEdicaoPonto';
import ModalCriarPonto from './ModalCriarPonto';
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
  role: string;
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

export default function TabelaHistoricoPonto({ pontosIniciais, nomeColaborador, colaboradorId, role }: TabelaProps) {
  const pontos = pontosIniciais;
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<any | null>(null);

  const [isCriarPontoOpen, setIsCriarPontoOpen] = useState(false);
  const [dataCriarPontoSelecionada, setDataCriarPontoSelecionada] = useState("");

  const [isAtestadoOpen, setIsAtestadoOpen] = useState(false);
  const [isAtestadoPending, setIsAtestadoPending] = useState(false);
  const [dataAtestadoSelecionada, setDataAtestadoSelecionada] = useState("");

  const MINUTOS_ESPERADOS_DIARIOS = 510;
  const TOLERANCIA_CLT = 10;

  const hojeStr = new Date().toLocaleDateString('sv-SE');

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

  const handleAdicionarPontoManual = (dataStr: string) => {
    setDataCriarPontoSelecionada(dataStr);
    setIsCriarPontoOpen(true);
  };

  const handleDeletar = async (id: number) => {
    if (confirm("Deseja realmente excluir este registro? Essa ação recalculará o banco de horas.")) {
      await deletarPonto(id);
      router.refresh();
    }
  };

  const handleMarcarFeriado = async (dataStr: string) => {
    const dataFormatadaBR = dataStr.split('-').reverse().join('/');
    if (confirm(`Deseja marcar o dia ${dataFormatadaBR} como Feriado/Recesso?`)) {
      try {
        await criarFeriado(colaboradorId, dataStr);
        router.refresh();
      } catch (err) {
        alert("Erro ao salvar feriado no banco de dados.");
      }
    }
  };

  const handleAbrirModalAtestado = (dataStr: string) => {
    setDataAtestadoSelecionada(dataStr);
    setIsAtestadoOpen(true);
  };

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
      router.refresh();
    } catch (error) {
      alert("Erro ao salvar atestado");
    } finally {
      setIsAtestadoPending(false);
    }
  }

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

  // --- FUNÇÃO COMPARTILHADA: calcula status/flags de um dia (usada na tabela E nos cards) ---
  function montarDadosLinha(dia: LinhaDiaria) {
    const totalCompensado = dia.minutosTrabalhados + dia.minutosAtestado;
    const diaDaSemana = dia.dataObjeto.getDay();
    const ehDiaUtil = diaDaSemana >= 1 && diaDaSemana <= 5;
    const desvio = totalCompensado - MINUTOS_ESPERADOS_DIARIOS;

    const temRegistroValido = dia.batidasFisicas.length > 0 || dia.atestados.length > 0 || dia.feriados.length > 0;
    const ehDiaFuturo = dia.dataStr > hojeStr;

    let tagStatus = { texto: "Fim de Semana", classe: "bg-surface-muted text-secondary border border-line" };

    if (ehDiaFuturo) {
      tagStatus = { texto: "Não Iniciado", classe: "bg-surface-soft text-subtle border border-line italic font-normal" };
    } else if (ehDiaUtil) {
      if (!temRegistroValido) {
        tagStatus = { texto: "Falta Sem Justificativa", classe: "bg-danger-soft text-danger-ink border border-danger-line font-bold" };
      } else if (dia.feriados.length > 0) {
        tagStatus = { texto: "Feriado / Recesso", classe: "bg-warning-soft text-warning-ink border border-warning-line font-semibold" };
      } else {
        if (Math.abs(desvio) <= TOLERANCIA_CLT) {
          tagStatus = { texto: "Jornada Completa", classe: "bg-info-soft text-info-ink border border-info-line" };
        } else if (desvio > TOLERANCIA_CLT) {
          tagStatus = { texto: `H. Extra (+${formatarMinutos(desvio)})`, classe: "bg-success-soft text-success-ink border border-success-line" };
        } else {
          tagStatus = { texto: `Incompleta (${formatarMinutos(Math.abs(desvio))})`, classe: "bg-danger-soft text-danger-ink border border-danger-line" };
        }
      }
    } else {
      if (dia.feriados.length > 0) {
        tagStatus = { texto: "Feriado no FDS", classe: "bg-warning-soft text-warning-ink border border-warning-line" };
      } else if (totalCompensado > 0) {
        tagStatus = { texto: `H. Extra FDS (+${formatarMinutos(totalCompensado)})`, classe: "bg-success-soft text-success-ink border border-success-line" };
      }
    }

    if (dia.atestados.length > 0 && totalCompensado >= MINUTOS_ESPERADOS_DIARIOS) {
      tagStatus = { texto: "Abonado pelo Art. 58", classe: "bg-violet-soft text-violet-ink border border-violet-line" };
    }

    const ehFaltaMeioSemana = ehDiaUtil && tagStatus.texto === "Falta Sem Justificativa";
    const ehIncompletoMeioSemana = ehDiaUtil && tagStatus.texto.startsWith("Incompleta");

    return { totalCompensado, ehDiaUtil, temRegistroValido, ehDiaFuturo, tagStatus, ehFaltaMeioSemana, ehIncompletoMeioSemana };
  }

  // --- Bloco de ações (usado no fim de cada card e na célula "Ações" da tabela) ---
  function BlocoAcoes({ dia, ehDiaUtil, ehFaltaMeioSemana, ehIncompletoMeioSemana }: {
    dia: LinhaDiaria; ehDiaUtil: boolean; ehFaltaMeioSemana: boolean; ehIncompletoMeioSemana: boolean;
  }) {
    return (
      <div className="flex items-center flex-wrap gap-1.5">
        {ehDiaUtil && (
          <button
            onClick={() => handleAdicionarPontoManual(dia.dataStr)}
            className="mobile-touch-target text-[11px] bg-surface hover:bg-success-soft text-secondary hover:text-success-ink border border-line hover:border-success-line px-2 py-1 rounded transition-all font-medium flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <PlusCircle size={12} className="text-success-ink" /> + Ponto
          </button>
        )}

        {ehFaltaMeioSemana && (
          <button
            onClick={() => handleMarcarFeriado(dia.dataStr)}
            className="mobile-touch-target text-[11px] bg-surface hover:bg-warning-soft text-secondary hover:text-warning-ink border border-line hover:border-warning-line px-2 py-1 rounded transition-all font-medium flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <CalendarDays size={12} /> + Feriado
          </button>
        )}

        {(ehFaltaMeioSemana || ehIncompletoMeioSemana) && (
          <button
            onClick={() => handleAbrirModalAtestado(dia.dataStr)}
            className="mobile-touch-target text-[11px] bg-surface hover:bg-violet-soft text-secondary hover:text-violet-ink border border-line hover:border-violet-line px-2 py-1 rounded transition-all font-medium flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <FilePlus2 size={12} /> + Atestado
          </button>
        )}

        {!ehDiaUtil && (
          <span className="text-subtle text-xs italic">Fim de Semana</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border overflow-hidden mt-6">
      <div className="p-4 bg-surface-soft border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-bold text-secondary">Relatório de Ponto Diário Estruturado</h2>
          <p className="text-sm text-muted">Visão consolidada do calendário incluindo faltas, folgas semanais e feriados.</p>
        </div>
      </div>

      {/* ==================== VIEW DESKTOP (TABELA) ==================== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-secondary">
          <thead>
            <tr className="bg-surface-muted text-secondary font-semibold uppercase text-xs tracking-wider border-b">
              <th className="p-4">Data / Dia</th>
              <th className="p-4">Sequência de Marcações</th>
              <th className="p-4 text-center">Total Computado</th>
              <th className="p-4 text-center">Status da Jornada</th>
              {role === "ADMIN" && <th className="p-4 text-center">Ações Em Bloco</th>}
            </tr>
          </thead>
          <tbody>
            {listaDatasOrdenadas.length > 0 ? (
              listaDatasOrdenadas.map((dia) => {
                const { totalCompensado, ehDiaUtil, ehDiaFuturo, temRegistroValido, tagStatus, ehFaltaMeioSemana, ehIncompletoMeioSemana } = montarDadosLinha(dia);

                return (
                  <tr key={dia.dataStr} className="border-b hover:bg-surface-soft/70 transition-colors">
                    <td className="p-4 font-medium text-foreground whitespace-nowrap">
                      {dia.dataObjeto.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <span className="text-xs text-subtle block font-normal">
                        {dia.dataObjeto.toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </span>
                    </td>

                    <td className="p-2">
                      <div className="grid grid-cols-2 gap-1.5 items-center">
                        {dia.batidasFisicas.map((ponto, idx) => {
                          const horaFormatada = new Date(ponto.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                          const ehEntrada = idx % 2 === 0;

                          return (
                            <div key={ponto.id} className="flex items-center gap-1 bg-surface border rounded shadow-sm px-2 py-1 group">
                              <span className={`w-1.5 h-1.5 rounded-full ${ehEntrada ? 'bg-green-500' : 'bg-orange-500'}`} title={ehEntrada ? "Entrada" : "Saída"} />
                              <span className="font-mono text-xs text-foreground">{horaFormatada}</span>

                              {role === "ADMIN" &&
                                <div className="flex items-center gap-0.5 ml-2 border-l pl-1 text-subtle">
                                  <button onClick={() => handleEditar(ponto)} title="Editar batida" className="mobile-touch-target hover:text-warning-ink p-0.5 transition-colors">
                                    <Pencil size={11} />
                                  </button>
                                  <button onClick={() => handleDeletar(ponto.id)} title="Excluir batida" className="mobile-touch-target hover:text-danger-ink p-0.5 transition-colors">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              }
                            </div>
                          );
                        })}

                        {dia.atestados.map((atestado) => (
                          <div key={atestado.id} className="flex items-center gap-1 bg-violet-soft border border-violet-line rounded px-2 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span className="text-xs font-medium text-violet-ink">{formatarMinutos(Number(atestado.tipo.split(": ")[1] || 0))}</span>

                            {role === "ADMIN" &&
                              <div className="flex items-center gap-0.5 ml-2 border-l border-violet-line pl-1 text-violet-ink">
                                <button onClick={() => handleEditar(atestado)} title="Editar abono" className="mobile-touch-target hover:text-warning-ink p-0.5 transition-colors">
                                  <Pencil size={11} />
                                </button>
                                <button onClick={() => handleDeletar(atestado.id)} title="Remover abono" className="mobile-touch-target hover:text-danger-ink p-0.5 transition-colors">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            }
                          </div>
                        ))}

                        {dia.feriados.map((feriado) => (
                          <div key={feriado.id} className="flex items-center gap-1 bg-warning-soft border border-warning-line rounded px-2 py-1">
                            <CalendarDays size={12} className="text-warning-ink" />
                            <span className="text-xs font-medium text-warning-ink">Feriado</span>
                            {role === "ADMIN" &&
                              <button onClick={() => handleDeletar(feriado.id)} title="Remover Feriado" className="ml-1.5 text-warning-ink hover:text-danger-ink transition-colors">
                                <Trash2 size={11} />
                              </button>
                            }
                          </div>
                        ))}

                        {!temRegistroValido && (
                          <span className="text-xs italic text-subtle font-normal col-span-2">Sem movimentações no ponto</span>
                        )}

                        {dia.batidasFisicas.length % 2 !== 0 && !ehDiaFuturo && (
                          <span className="text-[11px] bg-warning-soft text-warning-ink border border-warning-line px-1.5 py-0.5 rounded animate-pulse font-medium">
                            Falta Saída
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center font-semibold font-mono text-foreground whitespace-nowrap">
                      {dia.feriados.length > 0 || ehDiaFuturo ? "0h 00m" : formatarMinutos(totalCompensado)}
                      {dia.minutosAtestado > 0 && (
                        <span className="text-[10px] text-violet-ink font-sans block font-normal">
                          (Físico: {formatarMinutos(dia.minutosTrabalhados)})
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${tagStatus.classe}`}>
                        {tagStatus.texto}
                      </span>
                    </td>

                    {role === "ADMIN" &&
                      <td className="p-4 text-center whitespace-nowrap">
                        <BlocoAcoes dia={dia} ehDiaUtil={ehDiaUtil} ehFaltaMeioSemana={ehFaltaMeioSemana} ehIncompletoMeioSemana={ehIncompletoMeioSemana} />
                      </td>
                    }
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-subtle text-sm">
                  Nenhum registro mapeado para montar o calendário.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== VIEW MOBILE (CARDS) ==================== */}
      <div className="md:hidden divide-y">
        {listaDatasOrdenadas.length > 0 ? (
          listaDatasOrdenadas.map((dia) => {
            const { totalCompensado, ehDiaUtil, ehDiaFuturo, temRegistroValido, tagStatus, ehFaltaMeioSemana, ehIncompletoMeioSemana } = montarDadosLinha(dia);

            return (
              <div key={dia.dataStr} className="p-4 space-y-3">
                {/* Cabeçalho: data + status */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {dia.dataObjeto.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-subtle capitalize">
                      {dia.dataObjeto.toLocaleDateString('pt-BR', { weekday: 'long' })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide text-right shrink-0 ${tagStatus.classe}`}>
                    {tagStatus.texto}
                  </span>
                </div>

                {/* Total computado */}
                <div className="flex items-center justify-between text-sm bg-surface-soft rounded-lg px-3 py-2">
                  <span className="text-muted">Total Computado</span>
                  <span className="font-semibold font-mono text-foreground">
                    {dia.feriados.length > 0 || ehDiaFuturo ? "0h 00m" : formatarMinutos(totalCompensado)}
                    {dia.minutosAtestado > 0 && (
                      <span className="text-[10px] text-violet-ink font-sans block font-normal text-right">
                        (Físico: {formatarMinutos(dia.minutosTrabalhados)})
                      </span>
                    )}
                  </span>
                </div>

                {/* Marcações */}
                <div className="flex flex-wrap gap-1.5">
                  {dia.batidasFisicas.map((ponto, idx) => {
                    const horaFormatada = new Date(ponto.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const ehEntrada = idx % 2 === 0;

                    return (
                      <div key={ponto.id} className="flex items-center gap-1 bg-surface border rounded shadow-sm px-2 py-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${ehEntrada ? 'bg-green-500' : 'bg-orange-500'}`} title={ehEntrada ? "Entrada" : "Saída"} />
                        <span className="font-mono text-xs text-foreground">{horaFormatada}</span>

                        {role === "ADMIN" &&
                          <div className="flex items-center gap-1 ml-2 border-l pl-1 text-subtle">
                            <button onClick={() => handleEditar(ponto)} title="Editar batida" className="mobile-touch-target hover:text-warning-ink p-0.5">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDeletar(ponto.id)} title="Excluir batida" className="mobile-touch-target hover:text-danger-ink p-0.5">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        }
                      </div>
                    );
                  })}

                  {dia.atestados.map((atestado) => (
                    <div key={atestado.id} className="flex items-center gap-1 bg-violet-soft border border-violet-line rounded px-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span className="text-xs font-medium text-violet-ink">{formatarMinutos(Number(atestado.tipo.split(": ")[1] || 0))}</span>

                      {role === "ADMIN" &&
                        <div className="flex items-center gap-1 ml-2 border-l border-violet-line pl-1 text-violet-ink">
                          <button onClick={() => handleEditar(atestado)} title="Editar abono" className="mobile-touch-target hover:text-warning-ink p-0.5">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDeletar(atestado.id)} title="Remover abono" className="mobile-touch-target hover:text-danger-ink p-0.5">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      }
                    </div>
                  ))}

                  {dia.feriados.map((feriado) => (
                    <div key={feriado.id} className="flex items-center gap-1 bg-warning-soft border border-warning-line rounded px-2 py-1">
                      <CalendarDays size={12} className="text-warning-ink" />
                      <span className="text-xs font-medium text-warning-ink">Feriado</span>
                      {role === "ADMIN" &&
                        <button onClick={() => handleDeletar(feriado.id)} title="Remover Feriado" className="ml-1.5 text-warning-ink hover:text-danger-ink">
                          <Trash2 size={13} />
                        </button>
                      }
                    </div>
                  ))}

                  {!temRegistroValido && (
                    <span className="text-xs italic text-subtle font-normal">Sem movimentações no ponto</span>
                  )}

                  {dia.batidasFisicas.length % 2 !== 0 && !ehDiaFuturo && (
                    <span className="text-[11px] bg-warning-soft text-warning-ink border border-warning-line px-1.5 py-0.5 rounded font-medium">
                      Falta Saída
                    </span>
                  )}
                </div>

                {/* Ações (só ADMIN) */}
                {role === "ADMIN" && (
                  <div className="pt-1 border-t border-dashed">
                    <BlocoAcoes dia={dia} ehDiaUtil={ehDiaUtil} ehFaltaMeioSemana={ehFaltaMeioSemana} ehIncompletoMeioSemana={ehIncompletoMeioSemana} />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-subtle text-sm">
            Nenhum registro mapeado para montar o calendário.
          </div>
        )}
      </div>

      {/* MODAIS (sem alteração) */}
      <ModalEdicaoPonto
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dadosEdicao={pontoSelecionado}
      />

      <ModalCriarPonto
        colaboradorId={colaboradorId}
        isOpen={isCriarPontoOpen}
        onClose={() => setIsCriarPontoOpen(false)}
        dataInicial={dataCriarPontoSelecionada}
      />

      {isAtestadoOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-foreground">
          <div className="modal-panel bg-surface rounded-xl shadow-xl max-w-md w-full border  animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-surface-soft p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-secondary text-lg">Lançar Atestado / Abono</h3>
              <button
                onClick={() => setIsAtestadoOpen(false)}
                className="text-subtle hover:text-secondary font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAtestadoSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Data do Afastamento</label>
                <input
                  type="date"
                  name="data"
                  value={dataAtestadoSelecionada}
                  readOnly
                  required
                  className="w-full border rounded-lg p-2 bg-surface-muted text-muted cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Horas Abonadas</label>
                  <input
                    type="number"
                    name="horas_input"
                    min="0"
                    max="23"
                    defaultValue="8"
                    required
                    className="w-full border rounded-lg p-2 bg-surface-soft focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Minutos Abonados</label>
                  <input
                    type="number"
                    name="minutos_input"
                    min="0"
                    max="59"
                    defaultValue="30"
                    required
                    className="w-full border rounded-lg p-2 bg-surface-soft focus:outline-blue-500"
                  />
                </div>
              </div>

              <p className="text-xs text-subtle italic">
                O tempo preenchido será somado como crédito para abater as horas em falta do colaborador neste dia específico.
              </p>

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAtestadoOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted hover:bg-surface-muted rounded-lg transition-colors"
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
