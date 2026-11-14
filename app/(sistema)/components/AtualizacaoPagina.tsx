'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';

/** Server-rendered reports receive new props while React preserves open forms. */
export default function AtualizacaoPagina() {
  const router = useRouter();
  const buscar = useCallback(async () => {
    router.refresh();
    return null;
  }, [router]);
  useDadosAtualizados(buscar, null, { carregarAoMontar: false });
  return null;
}
