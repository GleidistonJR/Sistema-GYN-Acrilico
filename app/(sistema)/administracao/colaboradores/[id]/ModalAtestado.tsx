"use client";

import { useState } from "react";
import { adicionarAtestado } from "../actions"; // Ajuste o import do seu arquivo de actions

interface ModalAtestadoProps {
  colaboradorId: number;
}

export default function ModalAtestado({ colaboradorId }: ModalAtestadoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    
    // Customização para salvar as horas no campo tipo de forma simples:
    const horas = Number(formData.get("horas_input"));
    const minutos = Number(formData.get("minutos_input"));
    const minutosTotais = (horas * 60) + minutos;
    
    // Adicionamos os minutos convertidos para a action ler
    formData.append("colaboradorId", colaboradorId.toString());
    formData.append("horas", horas.toString());
    formData.append("minutos", minutos.toString());

    try {
      await adicionarAtestado(formData);
      setIsOpen(false);
    } catch (error) {
      alert("Erro ao salvar atestado");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
      >
        + Adicionar Atestado
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-700 text-lg">Lançar Atestado / Abono</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-400 hover:text-gray-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Data do Afastamento</label>
                <input 
                  type="date" 
                  name="data" 
                  required 
                  className="w-full border rounded-lg p-2 bg-gray-50 focus:outline-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Horas Abonadas</label>
                  <input 
                    type="number" 
                    name="horas_input" 
                    min="0" 
                    max="23" 
                    defaultValue="8" 
                    required
                    className="w-full border rounded-lg p-2 bg-gray-50 focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Minutos Abonados</label>
                  <input 
                    type="number" 
                    name="minutos_input" 
                    min="0" 
                    max="59" 
                    defaultValue="30" 
                    required
                    className="w-full border rounded-lg p-2 bg-gray-50 focus:outline-blue-500"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 italic">
                O tempo preenchido será somado como crédito para abater as horas em falta do colaborador.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  disabled={isPending}
                >
                  {isPending ? "Salvando..." : "Confirmar e Abater"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}