'use client';

import { useEffect, useState } from 'react';
import type { TextoRapido } from './textosRapidos';

type Catalogo = { textos: TextoRapido[]; podeGerenciar: boolean };

export function useTextosRapidos(ativo: boolean) {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!ativo) return;
    const controller = new AbortController();
    async function carregar() {
      try {
        const resposta = await fetch('/api/textos-rapidos', { cache: 'no-store', signal: controller.signal });
        if (!resposta.ok) throw new Error('Não foi possível carregar os textos rápidos.');
        const dados: Catalogo = await resposta.json();
        if (!controller.signal.aborted) {
          setCatalogo(dados);
          setErro('');
        }
      } catch {
        if (!controller.signal.aborted) setErro('Não foi possível carregar os textos rápidos. Feche e abra a lista para tentar novamente.');
      }
    }
    void carregar();
    return () => controller.abort();
  }, [ativo]);

  return { catalogo, erro, setCatalogo };
}
