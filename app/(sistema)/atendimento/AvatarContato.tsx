'use client';

import { useState } from 'react';

export default function AvatarContato({ nome, url, compacto = false }: { nome: string; url?: string | null; compacto?: boolean }) {
  const [falhou, setFalhou] = useState<string | null>(null);
  return <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-chat-avatar text-sm font-semibold text-success-ink ${compacto ? 'size-8 sm:size-10' : 'size-11'}`} aria-hidden="true">
    {nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
    {url && falhou !== url &&
      // WhatsApp CDN URLs change; avoid server image optimization/storage and keep native lazy loading.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" width={44} height={44} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFalhou(url)} className="absolute inset-0 size-full object-cover" />}
  </span>;
}
