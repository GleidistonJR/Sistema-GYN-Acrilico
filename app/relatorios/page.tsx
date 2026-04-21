"use client";
import { useEffect, useState } from 'react';

export default function Relatorios() {
  const [pontos, setPontos] = useState([]);

  useEffect(() => {
    fetch('/api/relatorios').then(res => res.json()).then(setPontos);
  }, []);

  // Função para transformar milissegundos em 00h 00m
  const formatarTempo = (ms) => {
    const minutosTotais = Math.floor(ms / 60000);
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
  };

  // Lógica principal de processamento
  const processarDados = () => {
    const diasAgrupados = {};

    pontos.forEach(p => {
      const chave = `${p.cpf}-${p.data}`;
      if (!diasAgrupados[chave]) {
        diasAgrupados[chave] = { nome: p.nome, data: p.data, timestamps: [] };
      }
      diasAgrupados[chave].timestamps.push(p.timestamp);
    });

    return Object.values(diasAgrupados).map(dia => {
      const t = dia.timestamps.sort((a, b) => a - b);
      let msTrabalhados = 0;

      // Manhã: Almoço (t[1]) - Entrada (t[0])
      if (t.length >= 2) msTrabalhados += (t[1] - t[0]);
      // Tarde: Saída Final (t[3]) - Retorno (t[2])
      if (t.length >= 4) msTrabalhados += (t[3] - t[2]);

      return { ...dia, total: formatarTempo(msTrabalhados), qtd: t.length };
    });
  };

  return (
    <main className="p-10 text-black">
      <h1 className="text-2xl font-bold mb-5">Relatório Consolidado</h1>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Funcionário</th>
            <th className="border p-2">Data</th>
            <th className="border p-2">Batidas</th>
            <th className="border p-2">Total de Horas</th>
          </tr>
        </thead>
        <tbody>
          {processarDados().map((item, i) => (
            <tr key={i} className="text-center border-b">
              <td className="p-2">{item.nome}</td>
              <td className="p-2">{item.data}</td>
              <td className="p-2">{item.qtd} / 4</td>
              <td className="p-2 font-bold text-blue-600">{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}