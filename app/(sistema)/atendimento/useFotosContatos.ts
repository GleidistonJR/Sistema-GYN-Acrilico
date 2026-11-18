'use client';

import { useEffect, useRef, useState } from 'react';

type Foto = { url: string | null; proxima: number; tentativas: number };

export function useFotosContatos(ids: string[]) {
  const cache = useRef(new Map<string, Foto>());
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const chave = ids.join(',');
  useEffect(() => {
    const visible = new Set<string>();
    const controller = new AbortController();
    let busy = false;
    let debounce: ReturnType<typeof setTimeout>;
    async function carregar() {
      if (busy || document.visibilityState !== 'visible') return;
      const ids = [...visible].filter(id => (cache.current.get(id)?.proxima || 0) <= Date.now()).slice(0, 50);
      if (!ids.length) return;
      busy = true;
      try {
        const response = await fetch('/api/atendimento/fotos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }), signal: controller.signal });
        if (!response.ok) throw new Error('Fotos indisponíveis');
        const data = await response.json() as { fotos: { id: string; url: string | null; pendente: boolean }[] };
        const next: Record<string, string | null> = {};
        for (const id of ids) {
          const foto = data.fotos.find(f => f.id === id);
          const tentativas = (cache.current.get(id)?.tentativas || 0) + 1;
          cache.current.set(id, { url: foto?.url || null, tentativas,
            proxima: Date.now() + (foto?.pendente ? (tentativas < 6 ? 10000 : 300000) : 1800000) });
          next[id] = foto?.url || null;
        }
        setUrls(previous => ({ ...previous, ...next }));
      } catch {
        if (!controller.signal.aborted) for (const id of ids) cache.current.set(id, { url: null, proxima: Date.now() + 300000, tentativas: 0 });
      } finally { busy = false; }
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.clienteId!;
        if (entry.isIntersecting) visible.add(id); else visible.delete(id);
      }
      clearTimeout(debounce); debounce = setTimeout(() => void carregar(), 250);
    });
    document.querySelectorAll('[data-cliente-id]').forEach(el => observer.observe(el));
    const timer = setInterval(() => void carregar(), 10000);
    return () => { observer.disconnect(); controller.abort(); clearTimeout(debounce); clearInterval(timer); };
  }, [chave]);
  return urls;
}
