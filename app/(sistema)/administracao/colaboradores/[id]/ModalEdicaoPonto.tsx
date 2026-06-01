"use client";
import { useState, useEffect } from 'react';
import { atualizarPonto } from '../actions'; // Ajuste o caminho das suas actions

interface PontoType {
  id: number;
  cpf?: string;
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
    dataHora: '',
    tipo: '',
    colaborador: { nome: '' }
  });

  const [motivo, setMotivo] = useState('');
  
  // Estados locais para controlar horas se for atestado
  const [horasAtestado, setHorasAtestado] = useState(8);
  const [minutosAtestado, setMinutosAtestado] = useState(30);

  const isAtestado = ponto.tipo.startsWith("Atestado");

  useEffect(() => {
    if (dadosEdicao && dadosEdicao.dataHora) {
      const d = new Date(dadosEdicao.dataHora);

      if (!isNaN(d.getTime())) {
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        const hora = String(d.getHours()).padStart(2, '0');
        const minuto = String(d.getMinutes()).padStart(2, '0');

        const formatoInput = `${ano}-${mes}-${dia}T${hora}:${minuto}`;

        setPonto({ ...dadosEdicao, dataHora: formatoInput });

        // Se for atestado, extrai os minutos salvos para os inputs numéricos
        if (dadosEdicao.tipo.startsWith("Atestado")) {
          const minutosTotais = Number(dadosEdicao.tipo.split(": ")[1] || 510);
          setHorasAtestado(Math.floor(minutosTotais / 60));
          setMinutosAtestado(minutosTotais % 60);
        }
      }
    }
  }, [dadosEdicao, isOpen]);

  if (!isOpen) return null;

  const handleSalvar = async () => {
    if (!ponto.dataHora) return alert("Selecione a data e hora.");

    let tipoFinal = ponto.tipo;

    // Se for atestado, reconstrói a string de minutos atualizada antes de salvar
    if (isAtestado) {
      const minutosTotais = (horasAtestado * 60) + minutosAtestado;
      tipoFinal = `Atestado: ${minutosTotais}`;
    }

    const dataFinal = new Date(ponto.dataHora);

    const resultado = await atualizarPonto({
      ...ponto,
      tipo: tipoFinal,
      dataHora: dataFinal.toISOString()
    }, motivo);

    if (resultado?.sucesso) {
      onClose();
      window.location.reload(); // Recarrega para computar os novos saldos na tela do servidor
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-black">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gray-100 p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 text-center">
            Modificar {isAtestado ? "Atestado" : "Registro de Ponto"}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <h3 className='text-lg text-center font-bold text-gray-800'>{ponto.colaborador?.nome}</h3>
          
          {/* Data do Evento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Data:</label>
            <input
              type={isAtestado ? "date" : "datetime-local"}
              value={isAtestado ? ponto.dataHora.split('T')[0] : ponto.dataHora}
              onChange={(e) => setPonto({ ...ponto, dataHora: isAtestado ? `${e.target.value}T12:00` : e.target.value })}
              className="mt-1 block w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Renderização Condicional se for Ponto ou Atestado */}
          {!isAtestado ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700">Tipo de Batida:</label>
              <select
                value={ponto.tipo}
                onChange={(e) => setPonto({ ...ponto, tipo: e.target.value })}
                className="mt-1 block w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Entrada">Entrada</option>
                <option value="Saida">Saída</option>
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Horas Abonadas:</label>
                <input
                  type="number"
                  min="0"
                  value={horasAtestado}
                  onChange={(e) => setHorasAtestado(Number(e.target.value))}
                  className="mt-1 block w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Minutos Abonados:</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutosAtestado}
                  onChange={(e) => setMinutosAtestado(Number(e.target.value))}
                  className="mt-1 block w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Motivo da Alteração:</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Correção de lançamento incorreto"
              className="mt-1 block w-full border rounded-md p-2 h-20 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t">
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