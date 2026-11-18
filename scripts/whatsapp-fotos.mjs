export function urlFotoSegura(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      ['whatsapp.net', 'fbcdn.net'].some(host => url.hostname === host || url.hostname.endsWith('.' + host)) ? url.href : null;
  } catch { return null; }
}

export function criarFotosContatos({ prisma, client, ativo }) {
  let running = false;
  let stopped = false;
  async function acordar() {
    if (running || stopped || !ativo()) return;
    running = true;
    try {
      // Separate from the message queue: one photo at a time, no bulk browser calls.
      while (!stopped && ativo()) {
        const rows = await prisma.$queryRaw`
          SELECT f."clienteId", c.telefone FROM "FotoContato" f JOIN "Cliente" c ON c.id = f."clienteId"
          WHERE f.pendente ORDER BY f."clienteId" LIMIT 10`;
        if (!rows.length) break;
        for (const row of rows) {
          if (stopped || !ativo()) break;
          let url = null;
          let failed = false;
          try { url = urlFotoSegura(await client.getProfilePicUrl(row.telefone.replace(/\D/g, '') + '@c.us')); }
          catch { failed = true; }
          if (stopped || !ativo()) break;
          // Missing/private photos are cached too. Transient errors retry after one hour.
          await prisma.$executeRaw`
            UPDATE "FotoContato" SET url = ${url}, pendente = FALSE,
              "consultadaEm" = NOW() - (${failed ? 23 : 0} * INTERVAL '1 hour')
            WHERE "clienteId" = ${row.clienteId}`;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch { console.error('Consulta de fotos indisponível; atendimento permanece ativo.'); }
    finally { running = false; }
  }
  return { acordar, stop() { stopped = true; } };
}
