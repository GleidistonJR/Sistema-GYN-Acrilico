"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function RegistroPonto() {

  return (
    <main className='grid grid-cols-1 md:grid-cols-4'>

      <nav className="col-span-1 bg-gray-200 flex flex-row md:flex-col p-2 gap-2 md:min-h-screen text-center overflow-x-auto">
        <Link href="/administracao/colaboradores" className="bg-[#003f8d] text-white p-2 rounded font-semibold text-sm">Colaboradores</Link>
        <Link href="/administracao/relatorioPontosAdmin" className="bg-[#003f8d] text-white p-2 rounded font-semibold text-sm">Pontos</Link>
        <Link href="/administracao/produtos" className="bg-[#003f8d] text-white p-2 rounded font-semibold text-sm">Produtos</Link>
      </nav>

      <article className='col-span-1 md:col-span-3'>
        <h1 className='text-2xl md:text-3xl my-6 text-center text-gray-700 font-bold'>Administração</h1>

        <div className='p-5'>
          <h2 className='text-xl md:text-2xl text-center'>Relatorio de vendas</h2>
          <p className="text-sm md:text-base">Lorem ipsum dolor sit, amet consectetur adipisicing elit. Numquam nesciunt nihil, praesentium suscipit illo delectus similique? Nisi rerum sint dolorum labore saepe, necessitatibus beatae aspernatur explicabo, dolore, magni libero nemo.</p>
        </div>

      </article>

    </main>
  );
}