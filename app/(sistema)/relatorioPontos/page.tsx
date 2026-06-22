"use client";
import { useEffect, useState } from 'react';
import { buscarPontos } from './actions';

interface Pontos {
  id: number;
  cpf: string;
  dataHora: string;
  tipo: string;
  colaborador: { nome: string };
}

// Função auxiliar para pegar a data de hoje no fuso do Brasil formato YYYY-MM-DD
const obterDataHojeString = () => {
  const dataFuso = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const [dia, mes, ano] = dataFuso.split('/');
  return `${ano}-${mes}-${dia}`;
};

export default function Relatorios() {
  const [pontos, setPontos] = useState<Pontos[]>([]);
  const [dataFiltro, setDataFiltro] = useState(obterDataHojeString());

  useEffect(() => {
    const carregar = async () => {
      if (!dataFiltro) return;

      // Agora passamos apenas a data para a Server Action
      const dados = await buscarPontos(dataFiltro);
      setPontos(dados);
    };

    carregar();
  }, [dataFiltro]); // Atualiza sempre que mudar a data

  return (
    <main className="text-gray-700 pb-10">
      <h1 className="text-3xl my-6 text-center text-gray-700 font-bold">Relatório Ponto</h1>

      <div className='text-center w-full flex flex-col items-center mb-5'>
        <label htmlFor="buscarData" className="text-sm font-semibold text-gray-500 mb-1">
          Filtrar pontos por dia:
        </label>
        <input
          type="date"
          value={dataFiltro}
          onChange={(e) => setDataFiltro(e.target.value)}
          name="buscarData"
          id="buscarData"
          className='border rounded p-2 text-gray-700 font-medium shadow-sm focus:outline-green-500'
        />
      </div>

      <table className="w-full lg:w-5/6 m-auto border-collapse border">
        <thead>
          <tr className="bg-gray-200">
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
                  <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${
                    ponto.tipo === 'Entrada' ? 'bg-green-100 text-green-800' :
                    ponto.tipo.startsWith('Atestado') ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {ponto.tipo.startsWith("Atestado") ? "Atestado" : ponto.tipo}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr className="text-center border-b">
              <td colSpan={4} className="p-2 text-gray-500 italic">
                Nenhum ponto registrado nesta data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main >
  );
}