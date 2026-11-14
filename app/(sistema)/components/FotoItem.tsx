'use client';

import { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { urlFoto, type FotoResumo } from '@/lib/fotoItem';

export default function FotoItem({ foto, nome }: { foto?: FotoResumo | null; nome: string }) {
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    if (!aberta) return;
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape') setAberta(false); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aberta]);

  if (!foto) return <div aria-label="Item sem foto" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-300"><Camera size={22} /></div>;
  const src = urlFoto(foto);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} aria-label={`Ampliar foto de ${nome}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-amber-400">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={nome} loading="lazy" decoding="async" className="h-full w-full object-contain" />
      </button>
      {aberta && <div role="dialog" aria-modal="true" aria-label={`Foto de ${nome}`} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => setAberta(false)}>
        <div className="relative w-full max-w-xl rounded-xl bg-white p-3" onClick={event => event.stopPropagation()}>
          <button type="button" onClick={() => setAberta(false)} aria-label="Fechar foto" autoFocus className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow"><X size={22} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={nome} className="max-h-[75dvh] w-full rounded-lg object-contain" />
          <p className="mt-2 break-words text-center text-sm text-gray-600">{nome}</p>
        </div>
      </div>}
    </>
  );
}
