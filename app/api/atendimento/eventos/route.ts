import { obterUsuarioSessao } from '@/lib/sessao';
import { criarCanalEventos } from '@/lib/whatsapp/canal-eventos.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const shared = globalThis as typeof globalThis & { canalAtendimento?: ReturnType<typeof criarCanalEventos> };

export async function GET(request: Request) {
  const user = await obterUsuarioSessao();
  if (!user || !['ADMIN', 'USER'].includes(user.role)) return new Response(null, { status: 401 });
  if (request.signal.aborted) return new Response(null, { status: 204 });
  const hub = shared.canalAtendimento ??= criarCanalEventos();
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe = () => {};
      const finish = () => {
        if (closed) return;
        closed = true; clearInterval(heartbeat); clearTimeout(lifetime); clearTimeout(startup);
        request.signal.removeEventListener('abort', finish); unsubscribe();
        try { controller.close(); } catch { /* The consumer may already have cancelled. */ }
      };
      const write = (data: string) => {
        if (closed) return;
        if ((controller.desiredSize ?? 0) < -8) { finish(); return; }
        controller.enqueue(encoder.encode(data));
      };
      const heartbeat = setInterval(() => write(': heartbeat\n\n'), 15000);
      // Reauthenticate before the serverless execution limit.
      const lifetime = setTimeout(finish, 55000);
      const startup = setTimeout(finish, 7000);
      cleanup = finish;
      write('retry: 1000\n\n');
      unsubscribe = hub.observar((event: string) => {
        if (event === 'erro') { finish(); return; }
        if (event === 'pronto') { clearTimeout(startup); write('event: pronto\ndata: {}\n\n'); }
        write('event: atualizar\ndata: {}\n\n');
      });
      request.signal.addEventListener('abort', finish, { once: true });
      if (request.signal.aborted) finish();
    },
    cancel() { cleanup(); },
  });
  // Empty invalidations only: each subsequent data fetch checks its own permissions.
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-cache, no-transform', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' } });
}
