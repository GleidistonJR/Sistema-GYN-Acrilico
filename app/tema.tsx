'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

type Tema = 'claro' | 'escuro';
const ContextoTema = createContext<{ tema: Tema; alternar: () => void } | null>(null);

export function ProvedorTema({ inicial, children }: { inicial: Tema; children: ReactNode }) {
  const [tema, setTema] = useState(inicial);

  function alternar() {
    const proximo = tema === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.dataset.tema = proximo;
    const seguro = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `gyn-tema=${proximo}; Path=/; Max-Age=31536000; SameSite=Lax${seguro}`;
    setTema(proximo);
  }

  return <ContextoTema.Provider value={{ tema, alternar }}>{children}</ContextoTema.Provider>;
}

export function BotaoTema() {
  const contexto = useContext(ContextoTema);
  if (!contexto) return null;
  const escuro = contexto.tema === 'escuro';

  return <button type="button" onClick={contexto.alternar} aria-label="Tema escuro" aria-pressed={escuro}
    title={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-surface-muted">
    {escuro ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
  </button>;
}
