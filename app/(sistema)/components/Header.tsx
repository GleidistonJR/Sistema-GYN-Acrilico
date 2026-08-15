"use client";
import Link from 'next/link';
import { deleteCookie, getCookie } from 'cookies-next';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [estaLogado, setEstaLogado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [dropdownMobileAberto, setDropdownMobileAberto] = useState(false);

  useEffect(() => {
    const sessao = getCookie('sessao_admin');
    setEstaLogado(!!sessao);
  }, [pathname]);

  useEffect(() => {
    function cliqueFora(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener("mousedown", cliqueFora);
    return () => document.removeEventListener("mousedown", cliqueFora);
  }, []);

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

  const linkClasse = (rota: string) =>
    `relative py-1 transition-colors duration-200 ${
      pathname === rota ? 'text-amber-400' : 'text-slate-200 hover:text-amber-400'
    }`;

  return (
    <header className="sticky top-0 z-50 print:hidden bg-gradient-to-b from-[#0A2540] to-[#051B36] border-b border-white/[0.06] shadow-[0_1px_0_0_rgba(240,162,2,0.15)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-baseline gap-1.5 font-semibold text-[15px] tracking-tight text-white">
            <span className="text-amber-400 font-bold">Sistema</span>
            <span className="text-slate-300 font-normal">Goiânia Acrílico</span>
          </Link>

          {/* Botão Mobile */}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="md:hidden p-2 rounded-md text-slate-200 hover:text-amber-400 hover:bg-white/5 transition-colors"
            aria-label="Abrir menu"
          >
            {menuAberto ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <Link href="/orcamentos" className={linkClasse('/orcamentos')}>Orçamentos</Link>
            <Link href="/baterPonto" className={linkClasse('/baterPonto')}>Bater ponto</Link>
            <Link href="/relatorioPontos" className={linkClasse('/relatorioPontos')}>Relatórios</Link>

            {/* Dropdown Desktop */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownAberto(!dropdownAberto)}
                className="flex items-center gap-1 py-1 text-slate-200 hover:text-amber-400 transition-colors focus:outline-none"
              >
                Administração
                <ChevronDown size={15} className={`transition-transform duration-200 ${dropdownAberto ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {dropdownAberto && (
                <div className="absolute right-0 mt-3 w-56 rounded-xl border border-white/10 bg-[#0A2540]/95 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
                  <Link href="/administracao" className="flex items-center px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 hover:text-amber-400 transition-colors">
                    Painel geral
                  </Link>
                  <Link href="/administracao/colaboradores" className="flex items-center px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 hover:text-amber-400 transition-colors">
                    Colaboradores
                  </Link>
                  <Link href="/relatorioPontos" className="flex items-center px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 hover:text-amber-400 transition-colors">
                    Pontos
                  </Link>
                  <Link href="/administracao/produtos" className="flex items-center px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 hover:text-amber-400 transition-colors">
                    Produtos
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="px-4 py-1.5 rounded-full text-sm font-semibold text-[#0A2540] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150"
            >
              {estaLogado ? 'Deslogar' : 'Login'}
            </button>
          </nav>
        </div>
      </div>

      {/* Menu Mobile */}
      <div className={`${menuAberto ? 'max-h-[480px]' : 'max-h-0'} md:hidden overflow-hidden transition-all duration-300 bg-[#061c38] border-t border-white/[0.06]`}>
        <div className="px-4 pt-3 pb-4 flex flex-col gap-1 text-[15px]">
          <Link href="/orcamentos" onClick={fecharMenu} className="px-2 py-2.5 rounded-md text-slate-200 hover:bg-white/5 hover:text-amber-400 transition-colors">
            Orçamentos
          </Link>
          <Link href="/baterPonto" onClick={fecharMenu} className="px-2 py-2.5 rounded-md text-slate-200 hover:bg-white/5 hover:text-amber-400 transition-colors">
            Bater ponto
          </Link>
          <Link href="/relatorioPontos" onClick={fecharMenu} className="px-2 py-2.5 rounded-md text-slate-200 hover:bg-white/5 hover:text-amber-400 transition-colors">
            Relatórios
          </Link>

          <button
            onClick={() => setDropdownMobileAberto(!dropdownMobileAberto)}
            className="w-full flex justify-between items-center px-2 py-2.5 rounded-md text-slate-200 hover:bg-white/5 font-medium focus:outline-none"
          >
            Administração
            <ChevronDown size={16} className={`transition-transform duration-200 ${dropdownMobileAberto ? 'rotate-180 text-amber-400' : ''}`} />
          </button>

          <div className={`${dropdownMobileAberto ? 'max-h-40' : 'max-h-0'} overflow-hidden transition-all duration-200 pl-3 border-l border-amber-400/30 ml-3`}>
            <Link href="/administracao" onClick={fecharMenu} className="block px-3 py-2 text-sm text-slate-300 hover:text-amber-400">
              Painel principal
            </Link>
            <Link href="/administracao/colaboradores" onClick={fecharMenu} className="block px-3 py-2 text-sm text-slate-300 hover:text-amber-400">
              Gerenciar colaboradores
            </Link>
          </div>

          <button
            onClick={() => { logout(); fecharMenu(); }}
            className="mt-2 px-2 py-2.5 rounded-md text-left text-sm font-semibold text-amber-400 bg-white/5"
          >
            {estaLogado ? 'Sair do sistema' : 'Fazer login'}
          </button>
        </div>
      </div>
    </header>
  );
}