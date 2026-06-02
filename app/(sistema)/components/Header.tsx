"use client";
import Link from 'next/link';
import { deleteCookie, getCookie } from 'cookies-next';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react'; // Adicionei para dar um feedback visual no menu

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [estaLogado, setEstaLogado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false); // Estado para o menu mobile
  const [dropdownAberto, setDropdownAberto] = useState(false); // Estado do dropdown desktop
  const [dropdownMobileAberto, setDropdownMobileAberto] = useState(false); // Estado do dropdown mobile

  useEffect(() => {
    const sessao = getCookie('sessao_admin');
    setEstaLogado(!!sessao);
  }, [pathname]);

  // Fecha o dropdown desktop se clicar em qualquer outro lugar da tela
  useEffect(() => {
    function cliqueFora(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener("mousedown", cliqueFora);
    return () => document.removeEventListener("mousedown", cliqueFora);
  }, []);

  // Fecha todos os submenus ao mudar de página
  useEffect(() => {
    setDropdownAberto(false);
    setDropdownMobileAberto(false);
    setMenuAberto(false);
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

  const fecharMenu = () => {
    setMenuAberto(false);
    setDropdownMobileAberto(false);
  };

  return (
    <header className="bg-[#003f8d] text-white shadow-md sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo / Nome da Empresa */}
          <div className="shrink-0 flex items-center">
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
            
            {/* ITEM COM DROPDOWN (DESKTOP) */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownAberto(!dropdownAberto)}
                className="flex items-center gap-1 hover:text-amber-400 transition-colors focus:outline-none cursor-pointer"
              >
                Administração
                <ChevronDown size={16} className={`transition-transform duration-200 ${dropdownAberto ? 'rotate-180' : ''}`} />
              </button>

              {/* CAIXA DO DROPDOWN */}
              {dropdownAberto && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg py-2 border border-gray-100 text-gray-700 font-medium z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <Link href="/administracao" className="block px-4 py-2 hover:bg-gray-100 hover:text-[#003f8d] transition-colors">
                    Painel Geral
                  </Link>
                  <Link href="/administracao/colaboradores" className="block px-4 py-2 hover:bg-gray-100 hover:text-[#003f8d] transition-colors">
                    Gerenciar Colaboradores
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="bg-amber-100 text-amber-600 hover:bg-white hover:cursor-pointer px-4 py-2 rounded-md transition-colors"
            >
              {estaLogado ? 'Deslogar' : 'Login'}
            </button>
          </nav>
        </div>
      </div>

      {/* Menu Mobile */}
      <div className={`${menuAberto ? 'block' : 'hidden'} md:hidden bg-[#002d66] border-t border-blue-800`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col text-start">
          <Link href="/orcamentos" onClick={fecharMenu} className="block px-3 py-2 rounded-md hover:bg-blue-800">Orçamentos</Link>
          <Link href="/baterPonto" onClick={fecharMenu} className="block px-3 py-2 rounded-md hover:bg-blue-800">Bater Ponto</Link>
          <Link href="/relatorioPontos" onClick={fecharMenu} className="block px-3 py-2 rounded-md hover:bg-blue-800">Relatórios</Link>
          
          {/* SEÇÃO DROPDOWN (MOBILE) */}
          <div className="block">
            <button
              onClick={() => setDropdownMobileAberto(!dropdownMobileAberto)}
              className="w-full flex justify-between items-center px-3 py-2 rounded-md hover:bg-blue-800 text-start font-semibold focus:outline-none"
            >
              Administração
              <ChevronDown size={16} className={`transition-transform duration-200 ${dropdownMobileAberto ? 'rotate-180' : ''}`} />
            </button>
            
            {/* LINKS INTERNOS DO DROPDOWN MOBILE */}
            <div className={`${dropdownMobileAberto ? 'block' : 'hidden'} pl-4 bg-[#002352] mt-1 rounded-md space-y-1 py-1`}>
              <Link href="/administracao" onClick={fecharMenu} className="block px-3 py-2 text-sm text-gray-300 hover:text-white">
                Painel Principal
              </Link>
              <Link href="/administracao/colaboradores" onClick={fecharMenu} className="block px-3 py-2 text-sm text-gray-300 hover:text-white">
                Gerenciar Colaboradores
              </Link>
            </div>
          </div>

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