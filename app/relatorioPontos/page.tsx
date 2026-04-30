"use client";
import { useEffect, useState } from 'react';
import { buscarPontos } from './actions';
import { Ponto } from "@prisma/client";

interface Pontos {
  id: number;
  cpf: string;
  dataHora: string;
  tipo: string;
  colaborador: { nome: string };
}

export default function Relatorios() {
  const [pontos, setPontos] = useState<Pontos[]>([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    // 1. Criamos um timer
    const delayBusca = setTimeout(() => {
      const carregar = async () => {
        const dados = await buscarPontos(filtro);
        setPontos(dados);
      };

      carregar();
    }, 500); // 500ms é um tempo equilibrado para o usuário parar de digitar

    // 2. IMPORTANTE: A função de limpeza (cleanup)
    // Ela cancela o timer anterior se o usuário digitar uma nova letra antes dos 500ms
    return () => clearTimeout(delayBusca);
  }, [filtro]);


  return (
    <main className="p-10 text-gray-700">
      <h1 className="text-3xl my-10 text-center text-gray-700 font-bold">Relatório Ponto</h1>

      <div className='text-center'>
        <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} name="buscarColaborador" id="buscarColaborador" className='border rounded py-1 px-16 m-5' placeholder='Buscar Colaborador' />

      </div>

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

              <tr key={ponto.id} className="text-center border-b " style={{ background: ponto.tipo === "Saida" ? '#fff' : '#beffbe' }}>
                <td className="p-2">{ponto.colaborador.nome}</td>
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