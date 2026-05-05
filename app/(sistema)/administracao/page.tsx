"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function RegistroPonto() {

  return (
    <main className='grid grid-cols-4'>
      <nav className="col-span-1 bg-gray-200 flex flex-col p-2 gap-2 min-h-screen text-center">
        <Link href="/colaboradores" className="bg-[#003f8d] text-white p-2 rounded font-semibold text-sm">Colaboradores</Link>
        <Link href="/relatorioPontosAdmin" className="bg-[#003f8d] text-white p-2 rounded font-semibold text-sm">Gerenciar Pontos</Link>
      </nav>

      <article className='col-span-3'>
        <h1 className='text-3xl my-6 text-center text-gray-700 font-bold'>Administração</h1>

        <div className='p-5'>
          <h2 className='text-2xl text-center'>Relatorio de vendas</h2>
          <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Numquam nesciunt nihil, praesentium suscipit illo delectus similique? Nisi rerum sint dolorum labore saepe, necessitatibus beatae aspernatur explicabo, dolore, magni libero nemo.</p>
        </div>

      </article>

    </main>
  );
}