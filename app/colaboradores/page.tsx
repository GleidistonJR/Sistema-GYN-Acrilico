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


  return (
    <main className="p-10 text-gray-700">
      <h1 className="text-3xl my-10 text-center text-gray-700 font-bold">Gestão de Colaboradores</h1>



      <article className='grid grid-cols-4 p-10 gap-10'>

        {colaboradores.length > 0 ? (
          colaboradores.map((Colaborador) => (



            <aside key={Colaborador.id} className='rounded-2xl shadow shadow-blue-950 text-center p-5 font-semibold space-x-6'>
              <h2 className='text-3xl font-semibold'>{Colaborador.nome}</h2>
              <p className='text-xl'>{Colaborador.cargo}</p>
              <p >CPF: {Colaborador.cpf}</p>
              <p>Salario: {(Colaborador.salario).toFixed(2)}</p>
              <button className='bg-red-700 text-white px-5 py-1 rounded' onClick={() => deletarColaborador(Colaborador.id)}>Deletar</button>
              <button className='bg-yellow-500 text-white px-5 py-1 rounded'>Editar</button>
            </aside>
          ))) : ('')}

        <aside onClick={() => setIsModalOpen(true)} className='rounded-2xl shadow shadow-blue-950 text-center font-semibold text-3xl flex text-green-600 hover:text-green-800 hover:cursor-pointer hover:shadow-md min-h-10'>
          <span className='m-auto'>Adicionar </span>
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