"use client";

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import ModalEdicaoPonto from './ModalEdicaoPonto';
import { deletarPonto } from '../actions'; // Ajuste seu import da action deletar

interface Ponto {
  id: number;
  dataHora: string | Date;
  tipo: string;
}

interface TabelaProps {
  pontosIniciais: Ponto[];
  nomeColaborador: string;
}

export default function TabelaHistoricoPonto({ pontosIniciais, nomeColaborador }: TabelaProps) {
  const [pontos, setPontos] = useState(pontosIniciais);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<any | null>(null);

  const formatarMinutos = (minutosTotais: number) => {
    const hrs = Math.floor(minutosTotais / 60);
    const mins = minutosTotais % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  const handleEditar = (ponto: Ponto) => {
    // Injeta o nome do colaborador esperado pelo modal estruturalmente
    setPontoSelecionado({
      ...ponto,
      colaborador: { nome: nomeColaborador }
    });
    setIsModalOpen(true);
  };

  const handleDeletar = async (id: number) => {
    if (confirm("Deseja realmente excluir este registro? Essa ação recalculará o banco de horas.")) {
      await deletarPonto(id);
      setPontos(prev => prev.filter(p => p.id !== id));
      window.location.reload(); // Recarrega a página para atualizar os cards de contagem no servidor
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <h2 className="text-lg font-bold p-4 bg-gray-50 border-b text-gray-700">Histórico de Pontos e Abonos</h2>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-600 text-sm">
            <th className="p-3 border-b">Data</th>
            <th className="p-3 border-b">Hora / Período</th>
            <th className="p-3 border-b">Tipo de Registro</th>
            <th className="p-3 border-b">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pontos.length > 0 ? (
            pontos.map((ponto) => (
              <tr key={ponto.id} className="border-b hover:bg-gray-50 text-gray-700">
                <td className="p-3 text-sm">{new Date(ponto.dataHora).toLocaleDateString('pt-BR')}</td>
                <td className="p-3 font-semibold text-sm">
                  {ponto.tipo.startsWith("Atestado") 
                    ? `Jornada Abonada (${formatarMinutos(Number(ponto.tipo.split(": ")[1] || 0))})`
                    : new Date(ponto.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  }
                </td>
                <td className="p-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    ponto.tipo === 'Entrada' ? 'bg-green-100 text-green-800' :
                    ponto.tipo.startsWith('Atestado') ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {ponto.tipo.startsWith("Atestado") ? "Atestado" : ponto.tipo}
                  </span>
                </td>
                <td className="p-3 flex gap-2 justify-center">
                  <button 
                    title="Editar" 
                    onClick={() => handleEditar(ponto)}
                    className='bg-amber-100 text-amber-700 rounded-full font-semibold p-2 text-sm hover:cursor-pointer hover:bg-amber-200'
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    title="Deletar" 
                    onClick={() => handleDeletar(ponto.id)}
                    className='bg-red-100 text-red-700 font-semibold p-2 text-sm hover:cursor-pointer hover:bg-red-200 rounded-full'
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="p-4 text-gray-400 text-sm">Nenhum registro encontrado para este mês.</td>
            </tr>
          )}
        </tbody>
      </table>

      <ModalEdicaoPonto 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dadosEdicao={pontoSelecionado}
      />
    </div>
  );
}