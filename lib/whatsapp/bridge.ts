import 'server-only';
import type { StatusWhatsApp } from './tipos';

export async function chamarWhatsApp(acao: 'status' | 'connect' | 'disconnect'): Promise<StatusWhatsApp> {
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
