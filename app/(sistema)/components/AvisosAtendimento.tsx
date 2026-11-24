'use client';

import Link from 'next/link';
import { Bell, BellOff, Monitor } from 'lucide-react';
import { useEffect, useState, type RefObject } from 'react';

type ConversaPendente = {
  clienteId: string; nomeCliente: string; mensagemId: string | null; recebidaEm: string | null; previa: string;
};
export type HistoricoAvisos = { usuarioId: string; consultadoEm: number; mensagens: Map<string, string | null> };

export default function AvisosAtendimento({ usuarioId, historicoRef }: {
  usuarioId: string;
  historicoRef: RefObject<HistoricoAvisos | null>;
}) {
  const chave = 'gyn:avisos-atendimento:' + usuarioId;
  const [ativos, setAtivos] = useState<boolean | null>(null);
  const [total, setTotal] = useState(0);
  const [permissao, setPermissao] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    function sincronizar() {
      const habilitados = window.localStorage.getItem(chave) !== '0';
      if (!habilitados) historicoRef.current = null;
      setAtivos(habilitados);
    }
    function aoAlterar(event: StorageEvent) {
      if (event.key === chave || event.key === null) sincronizar();
    }
    sincronizar();
    window.addEventListener('storage', aoAlterar);
    return () => window.removeEventListener('storage', aoAlterar);
  }, [chave, historicoRef]);

  useEffect(() => {
    function atualizarPermissao() {
      setPermissao(typeof Notification === 'undefined' ? null : Notification.permission);
    }
    atualizarPermissao();
    window.addEventListener('focus', atualizarPermissao);
    return () => window.removeEventListener('focus', atualizarPermissao);
  }, []);

  async function permitirAvisos() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    try {
      setPermissao(await Notification.requestPermission());
    } catch {
      setPermissao(Notification.permission);
    }
  }

  useEffect(() => {
    if (!ativos) return;
    let requisicao: AbortController | undefined;
    let espera: ReturnType<typeof setTimeout>;

    async function atualizar() {
      requisicao?.abort();
      const controller = new AbortController();
      requisicao = controller;
      const consultadoEm = Date.now();
      try {
        const resposta = await fetch('/api/atendimento/nao-lidas', { cache: 'no-store', signal: controller.signal });
        if (!resposta.ok) return;
        const dados: { total: number; conversas: ConversaPendente[] } = await resposta.json();
        if (controller.signal.aborted) return;
        setTotal(dados.total);
        const anterior = historicoRef.current;
        historicoRef.current = {
          usuarioId, consultadoEm, mensagens: new Map(dados.conversas.map(c => [c.clienteId, c.mensagemId])),
        };
        if (anterior?.usuarioId !== usuarioId || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        for (const conversa of dados.conversas) {
          if (!conversa.mensagemId || !conversa.recebidaEm || conversa.mensagemId === anterior.mensagens.get(conversa.clienteId)) continue;
          if (!anterior.mensagens.has(conversa.clienteId) && Date.parse(conversa.recebidaEm) < anterior.consultadoEm) continue;
          const notificacao = new Notification(conversa.nomeCliente || 'Nova mensagem no Atendimento', {
            body: conversa.previa || 'Enviou uma mensagem.',
            icon: '/favicon.ico',
            tag: 'gyn-atendimento:' + conversa.mensagemId,
          });
          notificacao.onclick = () => {
            window.focus();
            notificacao.close();
            window.location.assign('/atendimento?fila=meus&cliente=' + encodeURIComponent(conversa.clienteId));
          };
        }
      } catch {
        // Mantém a última contagem até a próxima atualização.
      }
    }

    function agendar() {
      clearTimeout(espera);
      espera = setTimeout(() => void atualizar(), 200);
    }

    void atualizar();
    const intervalo = setInterval(atualizar, 15000);
    window.addEventListener('focus', agendar);
    window.addEventListener('atendimento:atualizar', agendar);
    return () => {
      requisicao?.abort();
      clearTimeout(espera);
      clearInterval(intervalo);
      window.removeEventListener('focus', agendar);
      window.removeEventListener('atendimento:atualizar', agendar);
    };
  }, [ativos, historicoRef, usuarioId]);

  const pendentes = ativos ? total : 0;
  const aviso = pendentes
    ? pendentes + (pendentes === 1 ? ' cliente com mensagens não lidas' : ' clientes com mensagens não lidas')
    : 'Meus clientes no Atendimento';
  const Icone = ativos === false ? BellOff : Bell;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link href="/atendimento?fila=meus" aria-label={aviso} title={aviso}
        className={`relative grid size-9 place-items-center rounded-md hover:bg-surface-muted ${pendentes ? 'text-success-ink' : 'text-secondary'}`}>
        <Icone size={19} aria-hidden="true" />
        {pendentes > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-chat-action px-1 text-center text-[10px] leading-4 font-semibold text-white">
          {pendentes > 99 ? '99+' : pendentes}
        </span>}
      </Link>
      {ativos && permissao === 'default' && (
        <button type="button" onClick={() => void permitirAvisos()} title="Permitir avisos no Windows"
          aria-label="Permitir avisos no Windows" className="grid size-9 place-items-center rounded-md text-warning-ink hover:bg-surface-muted">
          <Monitor size={17} aria-hidden="true" />
        </button>
      )}
      <span role="status" className="sr-only">{pendentes > 0 ? aviso : ''}</span>
      <label title={ativos ? 'Silenciar avisos do Atendimento' : 'Ativar avisos do Atendimento'}
        className="relative grid h-9 w-8 shrink-0 cursor-pointer place-items-center">
        <input type="checkbox" role="switch" aria-label="Avisos do Atendimento" checked={ativos === true} disabled={ativos === null}
          className="peer sr-only" onChange={event => {
            const habilitados = event.target.checked;
            historicoRef.current = null;
            window.localStorage.setItem(chave, habilitados ? '1' : '0');
            setAtivos(habilitados);
            setTotal(0);
            if (habilitados) void permitirAvisos();
          }} />
        <span aria-hidden="true" className="relative h-4 w-7 rounded-full bg-surface-muted ring-1 ring-line peer-checked:bg-chat-action peer-focus-visible:ring-2 peer-focus-visible:ring-warning-ink">
          <span className={`absolute left-0.5 top-0.5 size-3 rounded-full ${ativos ? 'translate-x-3 bg-white' : 'bg-muted'}`} />
        </span>
      </label>
    </div>
  );
}
