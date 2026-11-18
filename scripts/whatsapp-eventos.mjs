import pg from 'pg';

export function criarEventosAtendimento({ onEnvio = () => {}, onFotos = () => {} } = {}) {
  const listeners = new Set();
  let database;
  let retry;
  let batch;
  let stopped = false;
  function publish() {
    if (batch) return;
    batch = setTimeout(() => {
      batch = null;
      for (const response of listeners) {
        if (response.writableLength > 65536) { response.end(); listeners.delete(response); }
        else response.write('event: atualizar\ndata: {}\n\n');
      }
    }, 80);
  }
  async function connect() {
    if (stopped) return;
    const url = new URL(process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL);
    if (url.hostname.endsWith('.neon.tech')) url.hostname = url.hostname.replace('-pooler.', '.');
    const connection = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000, keepAlive: true });
    database = connection;
    connection.on('notification', event => {
      if (event.channel === 'whatsapp_envio') onEnvio(event.payload);
      else if (event.channel === 'whatsapp_fotos') onFotos();
      else publish();
    });
    connection.on('error', () => { void connection.end().catch(() => {}); });
    connection.once('end', () => {
      if (!stopped) { for (const response of listeners) response.end(); listeners.clear(); retry = setTimeout(() => void connect(), 2000); }
    });
    try {
      await connection.connect();
      await connection.query('LISTEN atendimento_alterado');
      await connection.query('LISTEN whatsapp_envio');
      await connection.query('LISTEN whatsapp_fotos');
      onFotos();
      onEnvio(); // Catch up after reconnecting, without waiting for the fallback timer.
      publish();
    }
    catch { await connection.end().catch(() => {}); }
  }
  void connect();
  return {
    subscribe(response) {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      response.write('retry: 1000\nevent: atualizar\ndata: {}\n\n');
      listeners.add(response);
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15000);
      response.once('close', () => { clearInterval(heartbeat); listeners.delete(response); });
    },
    async stop() { stopped = true; clearTimeout(retry); clearTimeout(batch); for (const response of listeners) response.end(); listeners.clear(); await database?.end().catch(() => {}); },
  };
}
