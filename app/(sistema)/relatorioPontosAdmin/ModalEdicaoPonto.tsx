"use client";
import { useState, useEffect } from 'react';
import { atualizarPonto } from './actions'; // Você precisará criar essa action

interface PontoType {
  id: number;
  cpf: string;
  dataHora: string;
  tipo: string;
  colaborador: { nome: string };
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  dadosEdicao: PontoType | null;
}

export default function ModalEdicaoPonto({ isOpen, onClose, dadosEdicao }: ModalProps) {
  const [ponto, setPonto] = useState<PontoType>({
    id: 0,
    cpf: '',
    dataHora: '',
    tipo: '',
    colaborador: { nome: '' }
  });

  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (dadosEdicao && dadosEdicao.dataHora) {
      const d = new Date(dadosEdicao.dataHora);

      if (!isNaN(d.getTime())) {
        // Formata para "YYYY-MM-DDTHH:mm"
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        const hora = String(d.getHours()).padStart(2, '0');
        const minuto = String(d.getMinutes()).padStart(2, '0');

        const formatoInput = `${ano}-${mes}-${dia}T${hora}:${minuto}`;

        setPonto({ ...dadosEdicao, dataHora: formatoInput });
      }
    }
  }, [dadosEdicao, isOpen]);

  if (!isOpen) return null;

  const handleSalvar = async () => {
    if (!ponto.dataHora) return alert("Selecione a data e hora.");

    // O JavaScript entende o formato "YYYY-MM-DDTHH:mm" nativamente
    const dataFinal = new Date(ponto.dataHora);

    const resultado = await atualizarPonto({
      ...ponto,
      dataHora: dataFinal.toISOString() // Converte para o padrão do banco
    }, motivo);

    if (resultado?.sucesso) {
      onClose();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-black">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">

        <div className="bg-gray-100 p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 text-center">
            Editar Ponto:  <span className="text-blue-600">{ }</span>
          </h2>
        </div>

        <div className="p-6 space-y-4">

          <h3 className='text-lg text-center font-bold text-gray-800'>{ponto.colaborador.nome}</h3>
          {/* Campo de Data */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Data:</label>
            <input
              type="datetime-local"
              value={ponto.dataHora || ''}
              onChange={(e) => setPonto({ ...ponto, dataHora: e.target.value })}
              className="mt-1 block w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Campos de Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Tipo:</label>
              <select
                value={ponto.tipo}
                onChange={(e) => setPonto({ ...ponto, tipo: e.target.value })}
                className="mt-1 block w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Entrada">Entrada</option>
                <option value="Saida">Saida</option>
              </select>
            </div>

          </div>

          {/* Campo de Motivo (Importante para Auditoria) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Motivo da Alteração:</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Colaborador esqueceu de registrar a saída"
              className="mt-1 block w-full border rounded-md p-2 h-20 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition font-semibold"
            >
              Confirmar Edição
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}