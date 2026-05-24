"use client";
import { useState, useEffect } from 'react';
import { salvarColaborador } from './actions';
import { PatternFormat, NumericFormat } from 'react-number-format';

interface Colaboradortype {
  id?: number; // Opcional, pois no 'Novo' ele ainda não existe
  nome: string;
  cargo: string;
  cpf: string;
  salario: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  dadosEdicao?: Colaboradortype | null; // Opcional
}

export default function ModalRegistro({ isOpen, onClose, dadosEdicao }: ModalProps) {
  const [colaborador, setColaborador] = useState<Colaboradortype>({
    nome: '',
    cargo: '',
    cpf: '',
    salario: 0
  });

  // Este efeito roda sempre que o modal abre ou os dados de edição mudam
  useEffect(() => {
    if (dadosEdicao) {
      setColaborador(dadosEdicao);
    } else {
      // Limpa o formulário se for um novo cadastro
      setColaborador({ nome: '', cargo: '', cpf: '', salario: 0 });
    }
  }, [dadosEdicao, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!dadosEdicao; // Variável auxiliar para saber o modo

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-10 text-black">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>

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
            <PatternFormat
              format="###.###.###-##"
              mask="_"
              value={colaborador.cpf}
              // O 'values' é um objeto que a biblioteca nos dá. 
              // Usamos o 'values.value' para pegar apenas os números.
              onValueChange={(values) => {
                setColaborador({
                  ...colaborador,
                  cpf: values.value // Salva "12345678901" em vez de "123.456.789-01"
                });
              }}
              className="mt-1 block w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label className="block text-md">Salário:</label>
            <NumericFormat
              value={colaborador.salario}
              thousandSeparator="."
              decimalSeparator=","
              prefix="R$ "
              fixedDecimalScale
              decimalScale={2}
              // O 'values' é um objeto que a biblioteca nos dá. 
              // Usamos o 'values.value' para pegar apenas os números.
              onValueChange={(values) => {
                setColaborador({
                  ...colaborador,
                  salario: Number(values.value) // Salva "12345678901" em vez de "123.456.789-01"
                });
              }}
              className="mt-1 block w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="R$ 000,00"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded"
            >
              Cancelar
            </button>

            <button
              onClick={async () => {
                // Chamando a action que criamos acima
                const resultado = await salvarColaborador(colaborador);

                if (resultado.sucesso) {
                  onClose();
                  window.location.reload()
                } else {
                  alert(resultado.erro);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </div>
    </div> // Removi o ponto e vírgula que estava aqui!
  );
}