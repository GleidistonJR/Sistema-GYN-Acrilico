"use client";
import { useEffect, useState } from 'react';
import { buscarPontos, deletarPonto, buscarPontoPorId } from './actions';
import { Pencil, Trash2 } from 'lucide-react';
import ModalEdicaoPonto from './ModalEdicaoPonto';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<Pontos | null>(null);

  useEffect(() => {
    // 1. Criamos um timer
    const delayBusca = setTimeout(() => {
      const carregar = async () => {
        const dados = await buscarPontos(filtro);
        setPontos(dados);
      };

      carregar();
    }, 300); // 300ms é um tempo equilibrado para o usuário parar de digitar

    // 2. IMPORTANTE: A função de limpeza (cleanup)
    // Ela cancela o timer anterior se o usuário digitar uma nova letra antes dos 300ms
    return () => clearTimeout(delayBusca);
  }, [filtro]);

  const editar = async (id: number) => {
    try {
      // 1. Busca os dados
      const selecionado = await buscarPontoPorId(id);

      setPontoSelecionado(selecionado);
      setIsModalOpen(true);


      console.log("Dados carregados:", selecionado);
    } catch (error) {
      console.error("Erro ao buscar colaborador:", error);
    }

  }

  async function deletar(id: number) {
    if (confirm("Tem certeza?")) {
      await deletarPonto(id);
      // Filtra a lista local removendo o ID deletado (Atualização instantânea)
      setPontos(prev => prev.filter(c => c.id !== id));
    }
  }

  return (
    <main className=" text-gray-700">
      <h1 className="text-3xl my-6 text-center text-gray-700 font-bold">Relatório Ponto</h1>

      <div className='text-center w-full'>
        <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} name="buscarColaborador" id="buscarColaborador" className='border rounded my-5 w-80 p-2' placeholder='Buscar Colaborador' />

      </div>
      <div className='w-full overflow-x-auto'>


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

                <tr key={ponto.id} className="text-center border-b ">
                  <td className="p-2">{ponto.colaborador.nome}</td>
                  <td className="p-2">{new Date(ponto.dataHora).toLocaleDateString('pt-BR')}</td>
                  <td className="p-2">{new Date(ponto.dataHora).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</td>

                  <td className="p-2" > <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${ponto.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>{ponto.tipo}</span></td>

                  <td className="p-2 flex gap-2 justify-center">
                    <button title="Editar" onClick={() => editar(ponto.id)}
                      className='bg-amber-100 text-amber-700 rounded-full font-semibold p-2 text-sm hover:cursor-pointer hover:bg-amber-200'>
                      <Pencil size={18} />
                    </button>
                    <button title="Deletar" onClick={() => deletar(ponto.id)}
                      className='bg-red-100 text-red-700 font-semibold p-2 text-sm hover:cursor-pointer hover:bg-red-200 rounded-full'>
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
      </div>
      {/* O Componente do Modal isolado */}
      <ModalEdicaoPonto
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dadosEdicao={pontoSelecionado}
      />
    </main>
  );
}