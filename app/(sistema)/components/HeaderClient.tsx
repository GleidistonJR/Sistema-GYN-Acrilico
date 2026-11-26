"use client";
import Link from 'next/link';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { encerrarSessao } from '../login/actions';
import { BotaoTema } from '@/app/tema';
import AvisosAtendimento, { type HistoricoAvisos } from './AvisosAtendimento';
import { permite, PERFIS_ATENDIMENTO, PERFIS_CHAT_INTERNO, PERFIS_COMERCIAIS, PERFIS_REGISTRO_PONTO, PERFIS_RELATORIO_PONTO } from '@/lib/permissoes';

type UsuarioMenu = {
  id: string; role: string; userNome: string; userId: number | null;
} | null;

export default function HeaderClient({ usuario }: { usuario: UsuarioMenu }) {
  const pathname = usePathname();
  const historicoAvisos = useRef<HistoricoAvisos | null>(null);
  return <MenuNavegacao key={usuario?.id} usuario={usuario} pathname={pathname} historicoAvisos={historicoAvisos} />;
}

function MenuNavegacao({ usuario, pathname, historicoAvisos }: {
  usuario: UsuarioMenu; pathname: string; historicoAvisos: React.RefObject<HistoricoAvisos | null>;
}) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const estaLogado = !!usuario;
  const role = usuario?.role;
  const userNome = usuario?.userNome;
  const userId = usuario?.userId;
  const equipe = role === 'ADMIN' || role === 'USER';
  const comercial = permite(PERFIS_COMERCIAIS, role);
  const atendimento = permite(PERFIS_ATENDIMENTO, role);
  const chatInterno = permite(PERFIS_CHAT_INTERNO, role);
  const registrarPonto = permite(PERFIS_REGISTRO_PONTO, role);
  const verRelatorios = permite(PERFIS_RELATORIO_PONTO, role);

  const [menuAberto, setMenuAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [dropdownMobileAberto, setDropdownMobileAberto] = useState(false);
  const [rotaMenus, setRotaMenus] = useState(pathname);

  if (rotaMenus !== pathname) {
    setRotaMenus(pathname);
    setMenuAberto(false);
    setDropdownAberto(false);
    setDropdownMobileAberto(false);
  }

  useEffect(() => {
    function cliqueFora(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener("mousedown", cliqueFora);
    return () => document.removeEventListener("mousedown", cliqueFora);
  }, []);

  const logout = async () => {
    if (estaLogado) {
      await encerrarSessao();
      router.push('/');
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
    `relative py-1 transition-colors duration-200 ${pathname === rota ? 'text-warning-ink' : 'text-secondary hover:text-warning-ink'
    }`;

  return (
    <header className="sticky top-0 z-50 print:hidden border-b border-line bg-surface shadow-sm">

      <div className="mx-auto px-3 sm:px-6">

        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="min-w-0 flex flex-wrap items-baseline gap-x-1.5 font-semibold text-[13px] sm:text-[15px] tracking-tight text-foreground">
            <span className="text-warning-ink font-bold">Sistema</span>
            <span className="text-muted font-normal">Goiânia Acrílico</span>
          </Link>




          <div className="ml-auto flex items-center gap-1 sm:gap-3">
          {/* Botão Mobile */}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="md:hidden shrink-0 min-w-11 min-h-11 p-2 rounded-md text-secondary hover:text-warning-ink hover:bg-surface-muted transition-colors"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
          >
            {menuAberto ? <X size={22} /> : <Menu size={22} />}
          </button>




          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-3 text-sm lg:gap-6 font-medium">



            {atendimento && <Link href="/atendimento" className={linkClasse('/atendimento')}>Atendimento</Link>}
            {comercial && <Link href="/orcamentos" className={linkClasse('/orcamentos')}>Orçamentos</Link>}
            {comercial && !equipe && <>
              <Link href="/materiais" className={linkClasse('/materiais')}>Materiais</Link>
              <Link href="/produtos" className={linkClasse('/produtos')}>Produtos</Link>
            </>}




            {registrarPonto && <Link href="/baterPonto" className={linkClasse('/baterPonto')}>Bater ponto</Link>}
            {verRelatorios && <Link href="/relatorioPontos" className={linkClasse('/relatorioPontos')}>Relatórios</Link>}




            {equipe ? (
              <>
                <button
                  onClick={() => setDropdownAberto(!dropdownAberto)}
                  className="flex items-center gap-1 py-1 text-secondary hover:text-warning-ink transition-colors focus:outline-none"
                >
                  {userNome?.split(' ')[0]}
                  <ChevronDown size={15} className={`transition-transform duration-200 ${dropdownAberto ? 'rotate-180 text-warning-ink' : ''}`} />
                </button>

                {dropdownAberto && (
                  <div className="absolute right-0 top-0 mt-14 w-56 rounded-xl border border-line bg-surface backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className=" from-transparent via-amber-400/70 to-transparent" />
                    <Link href={"/administracao/colaboradores/" + userId} className="flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-muted hover:text-warning-ink transition-colors">
                      Meu Perfil
                    </Link>
                    <Link href="/materiais" className="flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-muted hover:text-warning-ink transition-colors">
                      Materiais
                    </Link>
                    <Link href="/produtos" className="flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-muted hover:text-warning-ink transition-colors">
                      Produtos
                    </Link>



                    {role === 'ADMIN' && (
                      <>
                        <div className="h-\[2px\] bg-linear-to-r from-transparent via-amber-400/70 to-transparent" />
                        <Link href="/administracao" className="flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-muted hover:text-warning-ink transition-colors">
                          Painel geral
                        </Link>
                        <Link href="/administracao/colaboradores" className="flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-muted hover:text-warning-ink transition-colors">
                          Colaboradores
                        </Link>
                        <Link href="/administracao/acessos" className="flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-muted hover:text-warning-ink transition-colors">
                          Acessos avulsos
                        </Link>
                      </>
                    )}



                    <button onClick={logout} className="px-4 py-1.5 w-full text-sm font-semibold text-[#0A2540] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150"
                    >
                      Deslogar
                    </button>
                  </div>
                )}


              </>

            ) : ('')}




            {estaLogado && !equipe &&

              <button onClick={logout} className="px-4 py-1.5 w-30 text-sm font-semibold text-[#0A2540] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150"
              >
                Deslogar
              </button>

            }




            {!estaLogado &&
              <button
                onClick={logout}
                className="px-4 py-1.5 text-sm font-semibold text-[#0A2540] bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all duration-150"
              >
                Acessar Sistema
              </button>
            }

          </nav>
          {(atendimento || chatInterno) && usuario && <AvisosAtendimento usuarioId={usuario.id} historicoRef={historicoAvisos} chatInterno={chatInterno} atendimento={atendimento} paginaChat={pathname === '/chat-interno'} />}
          <BotaoTema />
          </div>
        </div>
      </div>







      {/* Menu Mobile */}
      <div className={`${menuAberto ? 'max-h-[calc(100dvh-4rem)] overflow-y-auto' : 'max-h-0'} md:hidden overflow-hidden transition-all duration-300 bg-surface border-t border-line`}>
        <div className="px-4 pt-3 pb-4 flex flex-col gap-1 text-[15px]">

          {atendimento && (
            <Link href="/atendimento" onClick={fecharMenu} className="px-2 py-2.5 text-secondary">Atendimento</Link>
          )}
          {comercial && (
            <Link href="/orcamentos" onClick={fecharMenu} className="px-2 py-2.5 rounded-md text-secondary hover:bg-surface-muted hover:text-warning-ink transition-colors">
              Orçamentos
            </Link>
          )}

          {comercial && !equipe && <>
            <Link href="/materiais" onClick={fecharMenu} className="px-2 py-2.5 text-secondary">Materiais</Link>
            <Link href="/produtos" onClick={fecharMenu} className="px-2 py-2.5 text-secondary">Produtos</Link>
          </>}
          {registrarPonto && <Link href="/baterPonto" onClick={fecharMenu} className="px-2 py-2.5 rounded-md text-secondary hover:bg-surface-muted hover:text-warning-ink">Bater ponto</Link>}
          {verRelatorios && <Link href="/relatorioPontos" onClick={fecharMenu} className="px-2 py-2.5 rounded-md text-secondary hover:bg-surface-muted hover:text-warning-ink">Relatórios</Link>}

          {equipe && (
            <>
              <button
                onClick={() => setDropdownMobileAberto(!dropdownMobileAberto)}
                className="w-full flex justify-between items-center px-2 py-2.5 rounded-md text-secondary hover:bg-surface-muted font-medium focus:outline-none"
              >
                {userNome?.split(' ')[0]}
                <ChevronDown size={16} className={`transition-transform duration-200 ${dropdownMobileAberto ? 'rotate-180 text-warning-ink' : ''}`} />
              </button>

              <div className={`${dropdownMobileAberto ? 'max-h-96' : 'max-h-0'} overflow-hidden transition-all duration-200 pl-3 border-l border-amber-400/30 ml-3`}>
                <Link href={"/administracao/colaboradores/" + userId} onClick={fecharMenu} className="block px-3 py-3 text-sm text-muted hover:text-warning-ink">
                  Meu Perfil
                </Link>
                <Link href="/materiais" onClick={fecharMenu} className="block px-3 py-3 text-sm text-muted hover:text-warning-ink">
                  Materiais
                </Link>
                <Link href="/produtos" onClick={fecharMenu} className="block px-3 py-3 text-sm text-muted hover:text-warning-ink">Produtos</Link>

                {role === 'ADMIN' && (
                  <>
                    <Link href="/administracao" onClick={fecharMenu} className="block px-3 py-3 text-sm text-muted hover:text-warning-ink">
                      Painel geral
                    </Link>
                    <Link href="/administracao/colaboradores" onClick={fecharMenu} className="block px-3 py-3 text-sm text-muted hover:text-warning-ink">
                      Colaboradores
                    </Link>
                    <Link href="/administracao/acessos" onClick={fecharMenu} className="block px-3 py-3 text-sm text-muted hover:text-warning-ink">
                      Acessos avulsos
                    </Link>
                  </>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => { logout(); fecharMenu(); }}
            className="mt-2 px-2 py-2.5 rounded-md text-left text-sm font-semibold text-warning-ink bg-surface-muted"
          >
            {estaLogado ? 'Sair do sistema' : 'Fazer login'}
          </button>
        </div>
      </div>

    </header>
  );
}
