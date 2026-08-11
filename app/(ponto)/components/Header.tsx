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
        <div className="flex justify-center items-center h-16">


          {/* Menu Desktop */}
          <nav className="flex items-center space-x-8 text-sm font-semibold">
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


    </header>
  );
}