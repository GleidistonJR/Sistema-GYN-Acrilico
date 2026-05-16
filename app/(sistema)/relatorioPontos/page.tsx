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

export default function Relatorios() {
  const [pontos, setPontos] = useState<Pontos[]>([]);
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(1); // Novo estado para controlar a página

  // Resetar para a página 1 quando o usuário digitar uma nova busca
  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiltro(e.target.value);
    setPagina(1);
  };

  useEffect(() => {
    const delayBusca = setTimeout(() => {
      const carregar = async () => {
        // Passamos o filtro e a página atual para a action
        const dados = await buscarPontos(filtro, pagina);
        setPontos(dados);
      };

      carregar();
    }, 300);

    return () => clearTimeout(delayBusca);
  }, [filtro, pagina]); // Atualiza o useEffect se o filtro OU a página mudarem

  return (
    <main className="text-gray-700 pb-10">
      <h1 className="text-3xl my-6 text-center text-gray-700 font-bold">Relatório Ponto</h1>

      <div className='text-center w-full'>
        <input
          type="search"
          value={filtro}
          onChange={handleFiltroChange}
          name="buscarColaborador"
          id="buscarColaborador"
          className='border rounded my-5 w-80 p-2'
          placeholder='Buscar Colaborador'
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
                <td className="p-2" > <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${ponto.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>{ponto.tipo}</span></td>
              </tr>
        ))
        ) : (
        <tr className="text-center border-b">
          <td colSpan={4} className="p-2">Nenhum ponto encontrado!</td>
        </tr>
          )}
      </tbody>
    </table>

      {/* CONTROLES DE PAGINAÇÃO */ }
  <div className="flex justify-center items-center gap-4 mt-6">
    <button
      disabled={pagina === 1}
      onClick={() => setPagina((prev) => prev - 1)}
      className="px-4 py-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Anterior
    </button>

    <span className="font-semibold text-sm">Página {pagina}</span>

    <button
      disabled={pontos.length < 20} // Se veio menos de 20 registros, significa que é a última página
      onClick={() => setPagina((prev) => prev + 1)}
      className="px-4 py-2 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Próximo
    </button>
  </div>
    </main >
  );
}