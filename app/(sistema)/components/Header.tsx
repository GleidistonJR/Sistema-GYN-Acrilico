// components/Header.js

"use client";
import Link from 'next/link';
import { deleteCookie, getCookie } from 'cookies-next';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname(); // Ele detecta quando a URL muda
  const [estaLogado, setEstaLogado] = useState(false);

  // Verificamos o cookie assim que o componente carrega no navegador
  useEffect(() => {
    const sessao = getCookie('sessao_admin');
    setEstaLogado(!!sessao); // Transforma o valor em booleano (true se existir)
  }, [pathname]);

  const logout = () => {
    if (estaLogado) {
      deleteCookie('sessao_admin');
      setEstaLogado(false);
      router.push('/login');
      router.refresh();
    } else {
      router.push('/login');
    }
  };


  return (
    <header style={headerStyle}>
      <nav className=' flex justify-around'>
        <Link href="/">Orçamentos</Link>
        <Link href="/baterPonto"> Bater Ponto</Link>
        <Link href="/relatorioPontos"> Relatório Ponto</Link>
        <Link href="/colaboradores"> Colaboradores</Link>

        <button onClick={logout} className="hover:text-amber-400 transition-colors">
          {estaLogado ? 'Deslogar' : 'Login'}
        </button>
      </nav>
    </header>
  );
}

const headerStyle = {
  padding: '1rem',
  background: '#003f8d',
  color: 'white',
  fontWeight: '600',
};