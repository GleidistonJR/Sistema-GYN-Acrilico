'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { acompanharTransferencia } from './progressoTransferencia';

export default function BaixarAnexo({ url, nome, rotulo = 'Baixar arquivo' }: {
  url: string; nome: string; rotulo?: string;
}) {
  const requisicao = useRef<AbortController | null>(null);
  const [progresso, setProgresso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => () => { requisicao.current?.abort(); }, []);

  async function baixar() {
    if (requisicao.current) return;
    setErro('');
    const controller = new AbortController();
    requisicao.current = controller;
    const medicao = acompanharTransferencia('Baixando', 'Buscando arquivo no servidor…', setProgresso);
    try {
      const resposta = await fetch(`${url}${url.includes('?') ? '&' : '?'}baixar=1&link=1`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (!resposta.ok) throw new Error('O arquivo está indisponível. Tente baixar novamente.');
      const destino = (await resposta.json()).url as string;
      controller.signal.throwIfAborted();
      const arquivo = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', destino);
        xhr.responseType = 'blob';
        xhr.timeout = 300000;
        const cancelar = () => xhr.abort();
        controller.signal.addEventListener('abort', cancelar, { once: true });
        xhr.onprogress = medicao.atualizar;
        xhr.onload = () => {
          if (xhr.status === 200) resolve(xhr.response);
          else reject(new Error(xhr.status === 429 ? 'Outro arquivo está sendo buscado no WhatsApp. Tente novamente em instantes.' : 'Não foi possível baixar o arquivo. Tente novamente.'));
        };
        xhr.onerror = () => reject(new Error('A conexão falhou. Tente baixar novamente.'));
        xhr.ontimeout = () => reject(new Error('O download demorou demais. Tente novamente.'));
        xhr.onabort = () => reject(controller.signal.reason);
        xhr.onloadend = () => controller.signal.removeEventListener('abort', cancelar);
        xhr.send();
      });
      const objeto = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = objeto;
      link.download = nome;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objeto), 30000);
    } catch (error) {
      if (!controller.signal.aborted) setErro(error instanceof Error ? error.message : 'Não foi possível baixar o arquivo.');
    } finally {
      medicao.encerrar();
      requisicao.current = null;
      setProgresso('');
    }
  }

  return <div className="max-w-full text-xs">
    <button type="button" onClick={baixar} disabled={!!progresso}
      className="inline-flex items-center gap-1.5 font-semibold underline disabled:opacity-60">
      <Download size={16} aria-hidden="true" />{rotulo}
    </button>
    {progresso && <span className="ml-2">{progresso} <button type="button" className="underline" onClick={() => requisicao.current?.abort()}>Cancelar</button></span>}
    {erro && <p role="alert" className="text-warning-ink">{erro}</p>}
  </div>;
}
