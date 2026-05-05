"use client";
import { useEffect, useState } from 'react';
import { buscarPontos } from './actions';
import { Ponto } from "@prisma/client";
import { Pencil, Trash2 } from 'lucide-react';

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
    }, 300); // 500ms é um tempo equilibrado para o usuário parar de digitar

    // 2. IMPORTANTE: A função de limpeza (cleanup)
    // Ela cancela o timer anterior se o usuário digitar uma nova letra antes dos 500ms
    return () => clearTimeout(delayBusca);
  }, [filtro]);


  return (
    <main className=" text-gray-700">
      <h1 className="text-3xl my-6 text-center text-gray-700 font-bold">Relatório Ponto</h1>

      <div className='text-center w-full'>
        <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} name="buscarColaborador" id="buscarColaborador" className='border rounded my-5 w-80 p-2' placeholder='Buscar Colaborador' />

      </div>

      <table className="w-full lg:w-5/6 m-auto border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Funcionário</th>
            <th className="border p-2">Data</th>
            <th className="border p-2">Hora</th>
            <th className="border p-2">Tipo</th>
            <th className="border p-2">Modificar</th>
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
                <td className="p-2 flex gap-2 justify-center">
                  <button title="Editar" className='bg-amber-400 text-white font-semibold p-2 text-sm hover:cursor-pointer hover:bg-amber-500'>
                    <Pencil size={18} />
                  </button>
                  <button title="Deletar" className='bg-red-500 text-white font-semibold p-2 text-sm hover:cursor-pointer hover:bg-red-700'>
                    <Trash2 size={18} />
                  </button>
                </td>
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