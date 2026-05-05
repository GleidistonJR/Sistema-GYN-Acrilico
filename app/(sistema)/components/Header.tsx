"use client";
import Link from 'next/link';
import { deleteCookie, getCookie } from 'cookies-next';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [estaLogado, setEstaLogado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false); // Estado para o menu mobile

  useEffect(() => {
    const sessao = getCookie('sessao_admin');
    setEstaLogado(!!sessao);
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

  // Função para fechar o menu ao clicar em um link (mobile)
  const fecharMenu = () => setMenuAberto(false);

  return (
    <header className="bg-[#003f8d] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo / Nome da Empresa */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="font-bold text-lg tracking-tight">
              <span className="text-amber-400">Sistema</span> Goiânia Acrílico
            </Link>
          </div>

          {/* Botão Menu Mobile */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="inline-flex items-center justify-center p-2 rounded-md hover:text-amber-400 focus:outline-none"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {menuAberto ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>

          {/* Menu Desktop */}
          <nav className="hidden md:flex space-x-8 items-center text-sm font-semibold">
            <Link href="/orcamentos" className="hover:text-amber-400 transition-colors">Orçamentos</Link>
            <Link href="/baterPonto" className="hover:text-amber-400 transition-colors">Bater Ponto</Link>
            <Link href="/relatorioPontos" className="hover:text-amber-400 transition-colors">Relatórios</Link>
            <Link href="/administracao" className="hover:text-amber-400 transition-colors">Administração</Link>

            <button
              onClick={logout}
              className="bg-amber-400 hover:bg-amber-500 hover:cursor-pointer text-[#003f8d] px-4 py-2 rounded-md transition-all active:scale-95"
            >
              {estaLogado ? 'Deslogar' : 'Login'}
            </button>
          </nav>
        </div>
      </div>

      {/* Menu Mobile (Aparece apenas quando menuAberto for true) */}
      <div className={`${menuAberto ? 'block' : 'hidden'} md:hidden bg-[#002d66] border-t border-blue-800`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col text-start">
          <Link href="/orcamentos" onClick={fecharMenu} className="block px-3 py-2 rounded-md hover:bg-blue-800">Orçamentos</Link>
          <Link href="/baterPonto" onClick={fecharMenu} className="block px-3 py-2 rounded-md hover:bg-blue-800">Bater Ponto</Link>
          <Link href="/relatorioPontos" onClick={fecharMenu} className="block px-3 py-2 rounded-md hover:bg-blue-800">Relatórios</Link>
          <Link href="/administracao" onClick={fecharMenu} className="block px-3 py-2 rounded-md hover:bg-blue-800">Administração</Link>
          <button
            onClick={() => { logout(); fecharMenu(); }}
            className="w-full text-left px-3 py-2 text-amber-400 font-bold"
          >
            {estaLogado ? 'Sair do Sistema' : 'Fazer Login'}
          </button>
        </div>
      </div>
    </header>
  );
}