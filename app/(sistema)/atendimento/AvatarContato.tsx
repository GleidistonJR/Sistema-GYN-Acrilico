'use client';

import { useState } from 'react';

export default function AvatarContato({ nome, url }: { nome: string; url?: string | null }) {
  const [falhou, setFalhou] = useState<string | null>(null);
  return <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2d4444] text-sm font-semibold text-emerald-200" aria-hidden="true">
    {nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
    {url && falhou !== url &&
      // WhatsApp CDN URLs change; avoid server image optimization/storage and keep native lazy loading.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" width={44} height={44} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFalhou(url)} className="absolute inset-0 size-full object-cover" />}
  </span>;
}
