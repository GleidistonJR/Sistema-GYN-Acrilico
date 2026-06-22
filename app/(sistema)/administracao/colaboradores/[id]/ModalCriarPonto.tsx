"use client";

import { useState, useEffect } from 'react';
import { adicionarPontoManual } from '../actions'; // Ajuste o caminho da sua action

interface ModalCriarPontoProps {
  colaboradorId: number;
  isOpen: boolean;
  onClose: () => void;
  dataInicial?: string; // Recebe o "YYYY-MM-DD" da linha da tabela
}

export default function ModalCriarPonto({ colaboradorId, isOpen, onClose, dataInicial }: ModalCriarPontoProps) {
  const [dataHora, setDataHora] = useState('');
  const [tipo, setTipo] = useState('Entrada');
  const [loading, setLoading] = useState(false);

  // Efeito para preencher a data com o dia correto quando abrir vindo da tabela
  useEffect(() => {
    if (isOpen) {
      if (dataInicial) {
        // Se veio da linha, seta o dia com um horário padrão (ex: 08:00)
        setDataHora(`${dataInicial}T08:00`);
      } else {
        setDataHora('');
      }
      setTipo('Entrada');
    }
  }, [isOpen, dataInicial]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataHora) return alert("Por favor, selecione a data e a hora.");

    setLoading(true); // Corrigido para true
    try {
      // Converte a data do input local para o formato ISO aceito pelo Prisma
      const dataISO = new Date(dataHora).toISOString();
      
      const formData = new FormData();
      formData.append("colaboradorId", String(colaboradorId));
      formData.append("dataHora", dataISO);
      formData.append("tipo", tipo);

      await adicionarPontoManual(formData);
      
      onClose();
      window.location.reload(); // Recarrega a página para atualizar as somas no servidor
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar o ponto.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-black">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gray-100 p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 text-center">Lançar Ponto Manual</h2>
        </div>

        <form onSubmit={handleSalvar} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Data e Hora:</label>
            <input
              type="datetime-local"
              required
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="mt-1 block w-full border rounded-md p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Tipo de Batida:</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 block w-full border rounded-md p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="Entrada">Entrada</option>
              <option value="Saida">Saída</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition font-semibold disabled:bg-gray-400"
            >
              {loading ? "Salvando..." : "Salvar Ponto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}