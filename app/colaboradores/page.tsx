"use client";
import { useEffect, useState } from 'react';
import { buscarPontos } from './actions';
import { Ponto } from "@prisma/client";

export default function Relatorios() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    // Busca os pontos toda vez que o filtro mudar
    const carregar = async () => {
      const dados = await buscarPontos(filtro);
      setPontos(dados);
    };
    carregar();
  }, [filtro]);


  return (
    <main className="p-10 text-gray-700">
      <h1 className="text-3xl my-10 text-center text-gray-700 font-bold">Relatório Ponto</h1>

      <label htmlFor="colaborador"
        className=' font-semibold p-3'
      >Colaborador :

        <select
          id="colaborador"
          className='border rounded m-5 py-3 px-1'
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="71024617122">Gleidiston</option>
          <option value="001">Claudia</option>
          <option value="002">Jonas</option>
          <option value="003">teste</option>
        </select>
      </label>

      <table className="w-full border-collapse border">
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
                <td className="p-2">{ponto.cpf}</td>
                <td className="p-2">{new Date(ponto.dataHora).toLocaleDateString('pt-BR')}</td>
                <td className="p-2">{new Date(ponto.dataHora).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</td>
                <td className="p-2">{ponto.tipo}</td>
              </tr>
            ))
          ) : (
            <tr className="text-center border-b">
              <td className="p-2">Nenhum ponto encontrado!</td>
              
            </tr>
          )}

        </tbody>
      </table>
    </main>
  );
}