import pg from 'pg';

// Share one session per app instance. LISTEN cannot use transaction-mode pooling.
export function criarCanalEventos({ criarConexao = () => {
  const url = new URL(process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL);
  if (url.hostname.endsWith('.neon.tech')) url.hostname = url.hostname.replace('-pooler.', '.');
  return new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000, keepAlive: true });
} } = {}) {
  const observers = new Set();
  let connection = null;
  let ready = false;
  let batch;
  function publish(event) { for (const observer of [...observers]) observer(event); }
  async function connect() {
    const current = criarConexao(); connection = current;
    const fail = () => {
      if (connection !== current) return;
      connection = null; ready = false; clearTimeout(batch); batch = null;
      void current.end().catch(() => {}); publish('erro');
    };
    current.on('error', fail); current.on('end', fail);
    current.on('notification', event => {
      if (connection !== current || event.channel !== 'atendimento_alterado' || batch) return;
      batch = setTimeout(() => { batch = null; publish('atualizar'); }, 40);
    });
    try {
      await current.connect();
      if (connection !== current) return;
      await current.query('LISTEN atendimento_alterado');
      if (connection !== current) return;
      ready = true; publish('pronto');
    } catch { fail(); }
  }
  return {
    observar(observer) {
      observers.add(observer);
      if (!connection) void connect();
      else if (ready) queueMicrotask(() => { if (observers.has(observer)) observer('pronto'); });
      return () => {
        observers.delete(observer);
        if (!observers.size) {
          const previous = connection; connection = null; ready = false;
          clearTimeout(batch); batch = null;
          void previous?.end().catch(() => {});
        }
      };
    },
  };
}
