'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

export default function GravarAudio({ disabled, onArquivo, onGravando, onErro }: {
  disabled: boolean; onArquivo: (file: File) => void; onGravando: (value: boolean) => void; onErro: (message: string) => void;
}) {
  const [estado, setEstado] = useState<'parado' | 'iniciando' | 'gravando'>('parado');
  const [segundos, setSegundos] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mounted = useRef(false);
  const descartar = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; descartar.current = true; clearInterval(timer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  function parar(cancelar = false) {
    descartar.current = cancelar;
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach(t => t.stop());
    clearInterval(timer.current);
  }

  async function iniciar() {
    if (estado !== 'parado') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onErro('A gravação precisa de um navegador compatível, usando localhost ou HTTPS.'); return;
    }
    setEstado('iniciando'); onGravando(true); onErro(''); descartar.current = false;
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { audio.getTracks().forEach(t => t.stop()); return; }
      stream.current = audio;
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
      if (!mimeType) throw new Error('Formato de gravação não suportado neste navegador.');
      const media = new MediaRecorder(audio, { mimeType, audioBitsPerSecond: 64000 });
      recorder.current = media;
      const chunks: Blob[] = []; let tamanho = 0;
      media.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); tamanho += event.data.size; }
        if (tamanho > 10 * 1024 * 1024) { parar(true); if (mounted.current) onErro('A gravação ultrapassou 10 MB. Grave um áudio menor.'); }
      };
      media.onerror = () => { parar(true); if (mounted.current) onErro('Não foi possível gravar o áudio. Verifique o microfone.'); };
      media.onstop = () => {
        clearInterval(timer.current); audio.getTracks().forEach(t => t.stop());
        if (!mounted.current) return;
        setEstado('parado'); onGravando(false);
        if (!descartar.current && tamanho > 0) {
          const type = mimeType.split(';')[0];
          const ext = type === 'audio/mp4' ? 'm4a' : type.split('/')[1];
          onArquivo(new File(chunks, `audio-${Date.now()}.${ext}`, { type }));
        }
      };
      media.start(250); setSegundos(0); setEstado('gravando');
      const inicio = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - inicio) / 1000);
        setSegundos(elapsed);
        if (elapsed >= 120) parar();
      }, 250);
    } catch (error) {
      stream.current?.getTracks().forEach(t => t.stop());
      if (!mounted.current) return;
      setEstado('parado'); onGravando(false);
      onErro(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Permita o acesso ao microfone no navegador para gravar áudio.'
        : error instanceof DOMException && error.name === 'NotFoundError' ? 'Nenhum microfone foi encontrado.'
          : 'Não foi possível iniciar a gravação. Confira o microfone e tente novamente.');
    }
  }

  if (estado === 'gravando') return <div className="flex items-center gap-2 rounded-lg bg-[#2a3942] px-2 py-1">
    <span role="status" className="whitespace-nowrap text-xs text-red-300">● {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')}</span>
    <button type="button" onClick={() => parar(true)} aria-label="Descartar gravação" className="p-2 text-red-300"><Trash2 size={20} /></button>
    <button type="button" onClick={() => parar()} aria-label="Parar gravação" className="p-2 text-emerald-300"><Square size={20} /></button>
  </div>;
  return <button type="button" disabled={disabled || estado === 'iniciando'} onClick={iniciar} aria-label="Gravar áudio" title="Gravar áudio (até 2 minutos)" className="rounded-full p-3 text-[#aebac1] hover:bg-white/5 disabled:opacity-40"><Mic size={22} />{estado === 'iniciando' && <span className="sr-only">Aguardando microfone</span>}</button>;
}
