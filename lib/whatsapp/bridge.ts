import 'server-only';
import type { StatusWhatsApp } from './tipos';
import { prisma } from '@/lib/prisma';
import { lerEstadoServico, solicitarComandoServico } from './estado-servico.mjs';

export async function chamarWhatsApp(acao: 'status' | 'connect' | 'disconnect'): Promise<StatusWhatsApp> {
  // A Vercel function cannot access the company's loopback server. Read its heartbeat.
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL;
  const local = !bridgeUrl || ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(bridgeUrl).hostname);
  if (process.env.VERCEL && local) {
    if (acao !== 'status') await solicitarComandoServico(prisma, acao);
    return await lerEstadoServico(prisma) as StatusWhatsApp;
  }
  const token = process.env.WHATSAPP_BRIDGE_TOKEN;
  if (!token) throw new Error('Serviço do WhatsApp não configurado neste servidor.');
  const resposta = await fetch(`${process.env.WHATSAPP_BRIDGE_URL || 'http://127.0.0.1:3001'}/${acao}`, {
    method: acao === 'status' ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
    redirect: 'error',
  });
  if (!resposta.ok) throw new Error('Serviço do WhatsApp indisponível.');
  return resposta.json() as Promise<StatusWhatsApp>;
}
