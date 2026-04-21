"use client";
import { useEffect, useState } from 'react';

export default function Relatorios() {


  return (
    <main className="p-10 text-black">
      <h1 className="text-3xl my-10 text-center text-gray-700 font-bold">Relatório Ponto</h1>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Funcionário</th>
            <th className="border p-2">Data</th>
            <th className="border p-2">Tipo</th>
          </tr>
        </thead>
        <tbody>

          <tr className="text-center border-b">
            <td className="p-2">a</td>
            <td className="p-2">a</td>
            <td className="p-2">a</td>
          </tr>

        </tbody>
      </table>
    </main>
  );
}