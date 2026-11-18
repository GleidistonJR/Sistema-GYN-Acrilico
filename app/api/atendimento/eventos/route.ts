import { obterUsuarioSessao } from '@/lib/sessao';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await obterUsuarioSessao();
  if (!user || !['ADMIN', 'USER'].includes(user.role)) return new Response(null, { status: 401 });
  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  let timer = setTimeout(() => abort.abort(), 5000);
  try {
    const response = await fetch(`${process.env.WHATSAPP_BRIDGE_URL || 'http://127.0.0.1:3001'}/events`, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_BRIDGE_TOKEN}` }, cache: 'no-store', signal,
    });
    if (!response.ok || !response.body) throw new Error();
    clearTimeout(timer);
    // Reconnect and revalidate the session periodically. Only invalidations cross this stream.
    timer = setTimeout(() => abort.abort(), 55000);
    const reader = response.body.getReader();
    return new Response(new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { clearTimeout(timer); controller.close(); }
          else controller.enqueue(value);
        } catch { clearTimeout(timer); controller.close(); }
      },
      cancel() { clearTimeout(timer); abort.abort(); void reader.cancel().catch(() => {}); },
    }), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-cache, no-transform', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' } });
  } catch { clearTimeout(timer); abort.abort(); return new Response(null, { status: 503 }); }
}
