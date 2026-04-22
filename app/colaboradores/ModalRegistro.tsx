"use client";
import { useState } from 'react';

interface Colaboradortype {
  nome: string;
  cargo: string;
  cpf: string;
  salario: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Note: você chamou os argumentos de (cpf, tipo) na interface, 
  // mas está passando (cpf, nome) no botão. Verifique sua action!
  aoSalvar: (cpf: string, nome: string) => Promise<void>;
}

export default function ModalRegistro({ isOpen, onClose, aoSalvar }: ModalProps) {
  const [colaborador, setColaborador] = useState<Colaboradortype>({
    nome: '',
    cargo: '',
    cpf: '',
    salario: 0
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-10 text-black">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Novo colaborador</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-md">Nome:</label>
            <input
              type="text"
              value={colaborador.nome}
              onChange={(e) => setColaborador({ ...colaborador, nome: e.target.value })}
              className="mt-1 block w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-md">Cargo:</label>
            <input
              type="text"
              value={colaborador.cargo}
              onChange={(e) => setColaborador({ ...colaborador, cargo: e.target.value })}
              className="mt-1 block w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-md">CPF:</label>
            <input
              type="text"
              value={colaborador.cpf}
              onChange={(e) => setColaborador({ ...colaborador, cpf: e.target.value })}
              className="mt-1 block w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-md">Salário:</label>
            <input
              type="number" // Mudei para number para facilitar
              value={colaborador.salario}
              // Convertendo a string do input para número
              onChange={(e) => setColaborador({ ...colaborador, salario: Number(e.target.value) })}
              className="mt-1 block w-full border rounded-md p-2"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                aoSalvar(colaborador.cpf, colaborador.nome);
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div> // Removi o ponto e vírgula que estava aqui!
  ); 
}