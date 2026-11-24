'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Bell, BellOff, MessageSquare, Monitor } from 'lucide-react';
import { useEffect, useState, type RefObject } from 'react';

type ConversaPendente = {
  clienteId: string; nomeCliente: string; mensagemId: string | null; recebidaEm: string | null; previa: string;
};
type AvisoInterno = { colegaId: string; nome: string; mensagemId: number; recebidaEm: string; previa: string };
export type HistoricoAvisos = { usuarioId: string; consultadoEm: number; mensagens: Map<string, string | null> };
const ModalChatInterno = dynamic(() => import('../chat-interno/ModalChatInterno'));
const abrirChat = 'chat-interno:abrir';

export default function AvisosAtendimento({ usuarioId, historicoRef, chatInterno, atendimento }: {
  usuarioId: string;
  historicoRef: RefObject<HistoricoAvisos | null>;
  chatInterno: boolean;
  atendimento: boolean;
}) {
  const chave = 'gyn:avisos-atendimento:' + usuarioId;
  const [ativos, setAtivos] = useState<boolean | null>(null);
  const [total, setTotal] = useState(0);
  const [totalInternas, setTotalInternas] = useState(0);
  const [permissao, setPermissao] = useState<NotificationPermission | null>(null);
  const [janela, setJanela] = useState<{ colegaId: string | null } | null>(null);
  const janelaAberta = janela !== null;

  useEffect(() => {
    if (!chatInterno) return;
    function abrir(evento: Event) {
      const { destinatario, colegaId } = (evento as CustomEvent<{ destinatario: string; colegaId: string }>).detail;
      if (destinatario === usuarioId) setJanela({ colegaId });
    }
    window.addEventListener(abrirChat, abrir);
    return () => window.removeEventListener(abrirChat, abrir);
  }, [chatInterno, usuarioId]);

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
    if (!ativos && !(ativos === false && chatInterno && (janelaAberta || window.location.pathname === '/chat-interno'))) return;
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
        const dados: { total: number; conversas: ConversaPendente[]; internas?: AvisoInterno[] } = await resposta.json();
        if (controller.signal.aborted) return;
        setTotal(dados.total);
        const internas = dados.internas ?? [];
        setTotalInternas(internas.length);
        window.dispatchEvent(new CustomEvent('chat-interno:pendentes', { detail: internas.map(item => item.colegaId) }));
        if (!ativos) return;
        const avisos = [
          ...dados.conversas.map(item => ({
            chave: 'atendimento:' + item.clienteId, id: item.mensagemId, recebidaEm: item.recebidaEm,
            titulo: item.nomeCliente || 'Nova mensagem no Atendimento', previa: item.previa,
            abrir: () => window.location.assign('/atendimento?fila=meus&cliente=' + encodeURIComponent(item.clienteId)),
          })),
          ...internas.map(item => ({
            chave: 'interno:' + item.colegaId, id: String(item.mensagemId), recebidaEm: item.recebidaEm,
            titulo: item.nome + ' · Chat interno', previa: item.previa,
            abrir: () => window.dispatchEvent(new CustomEvent(abrirChat, {
              detail: { destinatario: usuarioId, colegaId: item.colegaId },
            })),
          })),
        ];
        const anterior = historicoRef.current;
        historicoRef.current = {
          usuarioId, consultadoEm, mensagens: new Map(avisos.map(item => [item.chave, item.id])),
        };
        if (anterior?.usuarioId !== usuarioId || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        for (const conversa of avisos) {
          if (!conversa.id || !conversa.recebidaEm || conversa.id === anterior.mensagens.get(conversa.chave)) continue;
          if (!anterior.mensagens.has(conversa.chave) && Date.parse(conversa.recebidaEm) < anterior.consultadoEm) continue;
          const notificacao = new Notification(conversa.titulo, {
            body: conversa.previa || 'Enviou uma mensagem.',
            icon: '/favicon.ico',
            tag: 'gyn:' + conversa.chave + ':' + conversa.id,
          });
          notificacao.onclick = () => {
            window.focus();
            notificacao.close();
            conversa.abrir();
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
    window.addEventListener('chat-interno:atualizar-avisos', agendar);
    return () => {
      requisicao?.abort();
      clearTimeout(espera);
      clearInterval(intervalo);
      window.removeEventListener('focus', agendar);
      window.removeEventListener('atendimento:atualizar', agendar);
      window.removeEventListener('chat-interno:atualizar-avisos', agendar);
    };
  }, [ativos, chatInterno, historicoRef, janelaAberta, usuarioId]);

  const pendentes = ativos ? total : 0;
  const aviso = pendentes
    ? pendentes + (pendentes === 1 ? ' cliente com mensagens não lidas' : ' clientes com mensagens não lidas')
    : 'Meus clientes no Atendimento';
  const Icone = ativos === false ? BellOff : Bell;
  const pendentesInternas = ativos ? totalInternas : 0;
  const avisoInterno = pendentesInternas ? `Chat interno, ${pendentesInternas} conversa(s) com mensagens não lidas` : 'Chat interno';

  return (
    <div className="flex shrink-0 items-center gap-1">
      {chatInterno && <button type="button" aria-label={avisoInterno} title={avisoInterno} aria-haspopup="dialog"
        onClick={() => setJanela({ colegaId: null })}
        className={`relative grid size-9 place-items-center rounded-md hover:bg-surface-muted ${pendentesInternas ? 'text-success-ink' : 'text-secondary'}`}>
        <MessageSquare size={19} aria-hidden="true" />
        {pendentesInternas > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-chat-action px-1 text-center text-[10px] leading-4 font-semibold text-white">
          {pendentesInternas > 99 ? '99+' : pendentesInternas}
        </span>}
      </button>}
      {chatInterno && janela && <ModalChatInterno colegaId={janela.colegaId}
        selecionar={colegaId => setJanela({ colegaId })} fechar={() => setJanela(null)} />}
      {atendimento && <Link href="/atendimento?fila=meus" aria-label={aviso} title={aviso}
        className={`relative grid size-9 place-items-center rounded-md hover:bg-surface-muted ${pendentes ? 'text-success-ink' : 'text-secondary'}`}>
        <Icone size={19} aria-hidden="true" />
        {pendentes > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-chat-action px-1 text-center text-[10px] leading-4 font-semibold text-white">
          {pendentes > 99 ? '99+' : pendentes}
        </span>}
      </Link>}
      {ativos && permissao === 'default' && (
        <button type="button" onClick={() => void permitirAvisos()} title="Permitir avisos no Windows"
          aria-label="Permitir avisos no Windows" className="grid size-9 place-items-center rounded-md text-warning-ink hover:bg-surface-muted">
          <Monitor size={17} aria-hidden="true" />
        </button>
      )}
      <span role="status" className="sr-only">{pendentes > 0 ? aviso : ''}</span>
      <label title={ativos ? 'Silenciar avisos de mensagens' : 'Ativar avisos de mensagens'}
        className="relative grid h-9 w-8 shrink-0 cursor-pointer place-items-center">
        <input type="checkbox" role="switch" aria-label={atendimento ? 'Avisos do Atendimento e do chat interno' : 'Avisos do chat interno'} checked={ativos === true} disabled={ativos === null}
          className="peer sr-only" onChange={event => {
            const habilitados = event.target.checked;
            historicoRef.current = null;
            window.localStorage.setItem(chave, habilitados ? '1' : '0');
            setAtivos(habilitados);
            setTotal(0);
            setTotalInternas(0);
            if (habilitados) void permitirAvisos();
          }} />
        <span aria-hidden="true" className="relative h-4 w-7 rounded-full bg-surface-muted ring-1 ring-line peer-checked:bg-chat-action peer-focus-visible:ring-2 peer-focus-visible:ring-warning-ink">
          <span className={`absolute left-0.5 top-0.5 size-3 rounded-full ${ativos ? 'translate-x-3 bg-white' : 'bg-muted'}`} />
        </span>
      </label>
    </div>
  );
}
