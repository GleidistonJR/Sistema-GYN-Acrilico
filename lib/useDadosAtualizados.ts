'use client';

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

const INTERVALO = 15_000;

interface Opcoes {
  ativo?: boolean;
  carregarAoMontar?: boolean;
}

/** Refresh server data without remounting the screen or changing form state. */
export function useDadosAtualizados<T>(buscar: () => Promise<T>, inicial: T, {
  ativo = true,
  carregarAoMontar = true,
}: Opcoes = {}) {
  const [dados, definirDados] = useState<T>(inicial);
  const [erro, setErro] = useState<Error | null>(null);
  const [carregando, setCarregando] = useState(ativo && carregarAoMontar);
  const versaoLocal = useRef(0);
  const solicitar = useRef<() => Promise<void>>(async () => {});

  const setDados = useCallback((valor: SetStateAction<T>) => {
    // A response started before a local save must not undo that save.
    versaoLocal.current++;
    definirDados(valor);
  }, []);

  const atualizar = useCallback(() => solicitar.current(), []);

  useEffect(() => {
    if (!ativo) return;
    let montado = true;
    let emAndamento = false;
    let repetir = false;

    async function buscarDados() {
      if (!montado || document.visibilityState === 'hidden' || !navigator.onLine) return;
      if (emAndamento) {
        repetir = true;
        return;
      }
      emAndamento = true;
      const versao = versaoLocal.current;
      try {
        const novosDados = await buscar();
        if (montado && versao === versaoLocal.current) {
          definirDados(atuais => JSON.stringify(atuais) === JSON.stringify(novosDados) ? atuais : novosDados);
          setErro(null);
        }
      } catch (error) {
        // Keep the last successful data visible, including during network failures.
        if (montado && versao === versaoLocal.current) setErro(error instanceof Error ? error : new Error('Falha ao atualizar os dados.'));
      } finally {
        emAndamento = false;
        if (montado) setCarregando(false);
        if (montado && repetir) {
          repetir = false;
          void buscarDados();
        }
      }
    }

    solicitar.current = buscarDados;
    const aoRetornar = () => { void buscarDados(); };
    if (carregarAoMontar) void buscarDados();
    const intervalo = window.setInterval(aoRetornar, INTERVALO);
    window.addEventListener('focus', aoRetornar);
    window.addEventListener('online', aoRetornar);
    document.addEventListener('visibilitychange', aoRetornar);

    return () => {
      montado = false;
      if (solicitar.current === buscarDados) solicitar.current = async () => {};
      window.clearInterval(intervalo);
      window.removeEventListener('focus', aoRetornar);
      window.removeEventListener('online', aoRetornar);
      document.removeEventListener('visibilitychange', aoRetornar);
    };
  }, [buscar, ativo, carregarAoMontar]);

  return { dados, setDados, atualizar, erro, carregando };
}
