"use client";
import { useEffect, useState } from 'react';
import { buscarPontos } from './actions';
import ModalRegistro from './ModalRegistro';
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



  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleSalvar(cpf: string, tipo: string) {
    // Aqui você chama sua action que criamos antes
    const res = await salvarPontoNoBanco(cpf, tipo);
    if (res.sucesso) {
      alert("Ponto registrado com sucesso!");
    }
  }



  return (
    <main className="p-10 text-gray-700">
      <h1 className="text-3xl my-10 text-center text-gray-700 font-bold">Gestão de Colaboradores</h1>



      <article className='grid grid-cols-4 p-10 gap-10'>
        <aside className='rounded-2xl shadow shadow-blue-950 text-center p-5 font-semibold'>
          <h2 className='text-3xl font-semibold'>Gleidiston</h2>
          <p className='text-xl'>Supervisor</p>
          <p >CPF: 710.246.171-22</p>
          <p>Salario: 1.500,00</p>
        </aside>

        <aside onClick={() => setIsModalOpen(true)} className='rounded-2xl shadow shadow-blue-950 text-center font-semibold text-3xl flex text-green-600 hover:text-green-800 hover:cursor-pointer hover:shadow-md'>
          <span className='m-auto'>Adicionar </span>
        </aside>

      </article>

      {/* O Componente do Modal isolado */}
      <ModalRegistro
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aoSalvar={handleSalvar}
      />
    </main>
  );
}