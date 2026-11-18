'use client';
import { useState } from 'react';

export default function AnexoMensagem({ id, midia }: { id: string; midia: { nome: string; mimeType: string } }) {
  const [url, setUrl] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  async function abrir() {
    setCarregando(true); setErro('');
    try {
      const response = await fetch(`/api/atendimento/midia/${id}?link=1`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Arquivo indisponível.');
      setUrl(data.url);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao abrir o anexo.'); }
    finally { setCarregando(false); }
  }
  const mediaError = () => { setUrl(''); setErro('Não foi possível baixar este arquivo do WhatsApp. Tente novamente; se ele expirou, peça ao cliente para reenviar.'); };
  return <div className="mb-2 max-w-sm rounded-lg bg-black/15 p-3">
    <p className="break-all text-sm font-semibold">{midia.nome}</p>
    <p className="mb-2 mt-1 text-[11px] opacity-70">{midia.mimeType.startsWith('video/') ? 'Vídeo' : midia.mimeType.startsWith('audio/') ? 'Áudio' : midia.mimeType.startsWith('image/') ? 'Imagem' : 'Arquivo'} · baixar ao abrir</p>
    {!url && <button type="button" disabled={carregando} onClick={abrir} className="text-xs font-semibold text-emerald-200 underline disabled:opacity-50">{carregando ? 'Preparando…' : 'Abrir anexo'}</button>}
    {url && midia.mimeType.startsWith('image/') && <img src={url} alt={midia.nome} onError={mediaError} referrerPolicy="no-referrer" className="mb-2 max-h-80 max-w-full rounded" />}
    {url && midia.mimeType.startsWith('audio/') && <audio controls preload="metadata" src={url} onError={mediaError} className="mb-2 max-w-full" />}
    {url && midia.mimeType.startsWith('video/') && <video controls playsInline preload="metadata" src={url} onError={mediaError} className="mb-2 max-h-96 max-w-full rounded" />}
    {url && <a href={url} target="_blank" rel="noopener noreferrer" download={midia.nome} className="text-xs font-semibold underline">Baixar arquivo</a>}
    {erro && <p role="alert" className="mt-2 text-xs text-amber-300">{erro}</p>}
  </div>;
}
