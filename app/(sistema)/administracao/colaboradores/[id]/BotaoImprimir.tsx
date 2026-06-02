"use client"; // <--- O segredo está aqui!

import { Printer } from "lucide-react";

export default function BotaoImprimir() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
    >
      <Printer size={16} /> Imprimir Relatório
    </button>
  );
}