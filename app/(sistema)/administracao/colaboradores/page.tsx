"use client";
import Link from 'next/link';
import ModalRegistro from './ModalRegistro';
import { buscarColaboradores, buscarColaboradorPorId, deletarColaborador } from './actions';
import { useState, useCallback } from 'react';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';
import { PatternFormat, NumericFormat } from 'react-number-format';
import { Eye, Pencil, Trash2 } from 'lucide-react';


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
  const buscar = useCallback(() => buscarColaboradores(filtro), [filtro]);
  const { dados: colaboradores, setDados: setColaboradores, atualizar } = useDadosAtualizados<Colaboradortype[]>(buscar, []);
  const [colaborador, setColaborador] = useState<Colaboradortype | null>(null);

  async function deletar(id: number) {
    if (confirm("Tem certeza?")) {
      await deletarColaborador(id);
      // Filtra a lista local removendo o ID deletado (Atualização instantânea)
      setColaboradores(prev => prev.filter(c => c.id !== id));
    }
  }

  const editar = async (id: number) => {
    try {
      // 1. Busca os dados
      const selecionado = await buscarColaboradorPorId(id);

      setColaborador(selecionado);
      setIsModalOpen(true);


      console.log("Dados carregados:", selecionado);
    } catch (error) {
      console.error("Erro ao buscar colaborador:", error);
    }

  }




  return (
    <main className="text-secondary px-4 sm:px-6 pb-8 max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl my-6 text-center text-secondary font-bold">Gestão de Colaboradores</h1>



      <article className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6'>

        {colaboradores.length > 0 ? (
          colaboradores.map((Colaborador) => (



            <aside key={Colaborador.id} className='border border-line-strong shadow-lg shadow-gray-500 rounded-xl min-w-0 font-semibold
            flex flex-col justify-between'>
              <h2 className='px-4 py-5 break-words border-b text-xl font-semibold text-center'>{Colaborador.nome}</h2>
              <div className='text-center text-xl font-normal py-5'>
                <p className='font-semibold pb-5'>{Colaborador.cargo}</p>

                {/* CPF Formatado */}
                <p>
                  CPF: <PatternFormat
                    value={Colaborador.cpf}
                    format="###.###.###-##"
                    displayType="text"
                  />
                </p>

                {/* Salário Formatado como Moeda Brasileira */}
                <p>
                  Salário: <NumericFormat
                    value={Colaborador.salario}
                    displayType="text"
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="R$ "
                    fixedDecimalScale
                    decimalScale={2}
                  />
                </p>

              </div>

              <div className='flex justify-center w-full gap-3 mb-5'>
                <Link href={`/administracao/colaboradores/${Colaborador.id}`} className='bg-success-soft text-success-ink p-3 m-0 rounded-full text-center block hover:bg-success-soft hover:cursor-pointer'><Eye size={18} /></Link>

                <button className='bg-warning-soft text-warning-ink p-3 m-0 rounded-full hover:bg-warning-soft hover:cursor-pointer' onClick={() => editar(Colaborador.id)}><Pencil size={18} /></button>

                <button className='bg-danger-soft text-danger-ink p-3 m-0 rounded-full hover:bg-danger-soft hover:cursor-pointer' onClick={() => deletar(Colaborador.id)}><Trash2 size={18} /></button>

              </div>
            </aside>
          ))) : ('')}

        <aside className='rounded-2xl border border-line-strong shadow-lg shadow-gray-500  flex justify-center'>
          <button onClick={() => setIsModalOpen(true)} className='py-20 font-semibold text-3xl w-full text-success-ink hover:text-success-ink hover:cursor-pointer hover:shadow-md '>Adicionar <br />Colaborador</button>
        </aside>

      </article>

      {/* O Componente do Modal isolado */}
      <ModalRegistro
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dadosEdicao={colaborador}
        onSalvar={atualizar}
      />
    </main>
  );
}
