"use client";
import { useCallback, useState } from 'react';
import { buscarPontos } from './actions';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';

// Função auxiliar para pegar a data de hoje no fuso do Brasil formato YYYY-MM-DD
const obterDataHojeString = () => {
  const dataFuso = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const [dia, mes, ano] = dataFuso.split('/');
  return `${ano}-${mes}-${dia}`;
};

export default function Relatorios() {
  const [dataFiltro, setDataFiltro] = useState(obterDataHojeString());
  const buscar = useCallback(() => buscarPontos(dataFiltro), [dataFiltro]);
  const { dados: pontos } = useDadosAtualizados(buscar, [], { ativo: !!dataFiltro });

  return (
    <div className="bg-surface-hover">
      <section className="bg-surface text-secondary px-4 sm:px-6 pb-10 xl:max-w-3/4 mx-auto">
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-6'>
          <h1 className="text-2xl sm:text-4xl text-center text-secondary font-bold">Relatório Ponto</h1>
          <div className='text-center flex flex-col items-center'>
            <label htmlFor="buscarData" className="text-sm font-semibold text-muted mb-1">
              Filtrar pontos por dia:
            </label>
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              name="buscarData"
              id="buscarData"
              className='border rounded p-2 text-secondary font-medium shadow-sm focus:outline-green-500'
            />
          </div>
        </div>
        <div className="space-y-3 sm:hidden">
          {pontos.length > 0 ? pontos.map(ponto => (
            <article key={ponto.id} className="rounded-xl border border-line p-4 space-y-3">
              <h2 className="font-semibold break-words">{ponto.colaborador.nome}</h2>
              <div className="flex flex-wrap justify-between items-center gap-3 text-sm">
                <p className="text-muted">
                  {new Date(ponto.dataHora).toLocaleDateString('pt-BR')}
                  <span className="block font-semibold text-foreground text-lg">
                    {new Date(ponto.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <span className={`px-3 py-1 rounded-full font-semibold ${ponto.tipo === 'Entrada' ? 'bg-success-soft text-success-ink' : ponto.tipo.startsWith('Atestado') ? 'bg-violet-soft text-violet-ink' : 'bg-warning-soft text-warning-ink'}`}>
                  {ponto.tipo.startsWith('Atestado') ? 'Atestado' : ponto.tipo}
                </span>
              </div>
            </article>
          )) : <p className="text-center py-6 text-muted italic">Nenhum ponto registrado nesta data.</p>}
        </div>
        <div className="hidden sm:block overflow-x-auto">
        <table className="w-full lg:w-5/6 m-auto border-collapse border">
          <thead>
            <tr className="bg-surface-hover">
              <th className="border p-2">Funcionário</th>
              <th className="border p-2">Data</th>
              <th className="border p-2">Hora</th>
              <th className="border p-2">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {pontos.length > 0 ? (
              pontos.map((ponto) => (
                <tr key={ponto.id} className="text-center border-b">
                  <td className="p-2">{ponto.colaborador.nome}</td>
                  <td className="p-2">{new Date(ponto.dataHora).toLocaleDateString('pt-BR')}</td>
                  <td className="p-2">{new Date(ponto.dataHora).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</td>
                  <td className="p-2" >
                    <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${ponto.tipo === 'Entrada' ? 'bg-success-soft text-success-ink' :
                        ponto.tipo.startsWith('Atestado') ? 'bg-violet-soft text-violet-ink' : 'bg-warning-soft text-warning-ink'
                      }`}>
                      {ponto.tipo.startsWith("Atestado") ? "Atestado" : ponto.tipo}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="text-center border-b">
                <td colSpan={4} className="p-2 text-muted italic">
                  Nenhum ponto registrado nesta data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section >
    </div>
  );
}
