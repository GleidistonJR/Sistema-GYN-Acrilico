// components/Header.js
import Link from 'next/link';

export default function Header() {
  return (
    <header style={headerStyle}>
      <nav>
        <Link href="/">Home</Link> | 
        <Link href="/registro"> Bater Ponto</Link> | 
        <Link href="/relatorios"> Relatórios</Link>
      </nav>
    </header>
  );
}

const headerStyle = {
  padding: '1rem',
  background: '#333',
  color: 'white',
  display: 'flex',
  justifyContent: 'center',
  gap: '20px'
};