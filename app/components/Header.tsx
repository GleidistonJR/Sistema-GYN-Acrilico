// components/Header.js
import Link from 'next/link';

export default function Header() {
  return (
    <header style={headerStyle}>
      <nav className=' flex justify-around'>
        <Link href="/">Orçamentos</Link> 
        <Link href="/baterPonto"> Bater Ponto</Link> 
        <Link href="/relatorioPontos"> Relatório Ponto</Link>
        <Link href="/colaboradores"> Colaboradores</Link>
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