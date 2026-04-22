"use client";
import ModalRegistro from './ModalRegistro';
import { buscarColaboradores, deletarColaborador } from './actions';
import { useState, useEffect } from 'react';


interface Colaboradortype {
  id: number;
  nome: string;
  cargo: string;
  cpf: string;
  salario: number;
}

export default function Relatorios() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [colaboradores, setColaboradores] = useState<Colaboradortype[]>([]);

  useEffect(() => {
    // Busca os pontos toda vez que o filtro mudar
    const carregar = async () => {
      const dados = await buscarColaboradores(filtro);
      setColaboradores(dados);
    };
    carregar();
  }, [filtro]);

  function deletar(id: number) {
    deletarColaborador(id)
    window.location.reload()
  }


  return (
    <main className="p-10 text-gray-700">
      <h1 className="text-3xl my-10 text-center text-gray-700 font-bold">Gestão de Colaboradores</h1>



      <article className='grid grid-cols-4 p-10 gap-10'>

        {colaboradores.length > 0 ? (
          colaboradores.map((Colaborador) => (



            <aside key={Colaborador.id} className='border border-gray-300 shadow-lg shadow-gray-500 rounded-xl font-semibold
            flex flex-col justify-between'>
              <h2 className='px-8 py-5 border-b text-xl font-semibold text-center'>{Colaborador.nome}</h2>
              <div className='text-center text-xl font-normal py-5'>
                <p className='font-semibold pb-5'>{Colaborador.cargo}</p>
                <p >CPF: {Colaborador.cpf}</p>
                <p>Salario: {(Colaborador.salario).toFixed(2)}</p>
              </div>
              <div className='flex text-white w-full'>
                <button className='bg-red-700 w-full py-2 m-0 rounded-bl-lg hover:bg-red-800 hover:cursor-pointer' onClick={() => deletar(Colaborador.id)}>Deletar</button>
                <button className='bg-amber-400 w-full rounded-br-lg hover:bg-amber-500 hover:cursor-pointer'>Editar</button>
              </div>
            </aside>
          ))) : ('')}

        <aside className='rounded-2xl border border-gray-300 shadow-lg shadow-gray-500  flex justify-center'>
          <button onClick={() => setIsModalOpen(true)} className='py-20 font-semibold text-3xl w-full text-green-600 hover:text-green-800 hover:cursor-pointer hover:shadow-md '>Adicionar <br />Colaborador</button>
        </aside>

      </article>

      {/* O Componente do Modal isolado */}
      <ModalRegistro
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}