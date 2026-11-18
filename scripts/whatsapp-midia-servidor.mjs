import http from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, rename, unlink, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { createHash } from 'node:crypto';
import { lerTransferencia, hashToken } from '../lib/whatsapp/transferencia.mjs';
import { validarMidia, LIMITE_MIDIA, nomeArquivo } from '../lib/whatsapp/conteudo.mjs';
import { caminhoArquivo, salvarArquivo, limparArquivos, espacoDisponivel } from './whatsapp-arquivos.mjs';

export function criarServidorMidia({ prisma, getClient, port = 3002 }) {
  let uploading = false, downloading = false;
  const locks = new Set();
  const cache = new Map();
  const cleanup = setInterval(() => {
    void limparArquivos().catch(() => {});
    void prisma.$executeRaw`DELETE FROM "TransferenciaWhatsApp" WHERE "expiresAt" < NOW()`.catch(() => {});
    for (const [id, item] of cache) if (item.until < Date.now()) { cache.delete(id); void unlink(item.path).catch(() => {}); }
  }, 60000);
  cleanup.unref();
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Vary', 'Origin');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/arquivo') { res.writeHead(404); res.end(); return; }
      const token = url.searchParams.get('token');
      const p = await lerTransferencia(prisma, token);
      if (!p || (req.headers.origin && req.headers.origin !== p.origem)) { res.writeHead(403); res.end(); return; }
      res.setHeader('Access-Control-Allow-Origin', p.origem);
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      if (req.method === 'PUT' && p.acao === 'upload') {
        if (p.pronto) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); req.resume(); return; }
        if (uploading || locks.has(p.chave)) { res.writeHead(429); res.end('Outra transferência está em andamento. Tente novamente.'); return; }
        uploading = true; locks.add(p.chave);
        const file = caminhoArquivo(p.chave), partial = file + '.part';
        try {
          await espacoDisponivel(p.tamanho);
          let size = 0; const hash = createHash('sha256');
          await pipeline(req, new Transform({ transform(chunk, _encoding, done) {
            size += chunk.length;
            if (size > p.tamanho || size > LIMITE_MIDIA) return done(new Error('Arquivo acima do limite.'));
            hash.update(chunk); done(null, chunk);
          } }), createWriteStream(partial, { flags: 'wx' }));
          if (size !== p.tamanho) throw new Error('Transferência incompleta. Tente novamente.');
          const f = await open(partial, 'r');
          let mimeType;
          try { const head = Buffer.alloc(Math.min(16, size)); await f.read(head, 0, head.length, 0); mimeType = validarMidia(head, p.mimeType); } finally { await f.close(); }
          await rename(partial, file);
          const payload = { ...p, mimeType, pronto: true, sha256: hash.digest('hex') };
          await prisma.$executeRaw`UPDATE "TransferenciaWhatsApp" SET payload = ${JSON.stringify(payload)}::jsonb WHERE "tokenHash" = ${hashToken(token)}`;
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
        } finally { uploading = false; locks.delete(p.chave); await unlink(partial).catch(() => {}); }
        return;
      }
      if (req.method !== 'GET' || p.acao !== 'download') { res.writeHead(405); res.end(); return; }
      const [m] = await prisma.$queryRaw`SELECT m."externaId", m.conta, m."clienteId", a.nome, a."mimeType", a.dados, f.chave
        FROM "MensagemWhatsApp" m JOIN "MidiaWhatsApp" a ON a."mensagemId" = m.id
        LEFT JOIN "ArquivoWhatsApp" f ON f."mensagemId" = m.id WHERE m.id = ${p.mensagemId} AND m."clienteId" = ${p.clienteId}`;
      if (!m) { res.writeHead(404); res.end(); return; }
      let file = m.chave ? caminhoArquivo(m.chave) : null;
      if (file && !await stat(file).catch(() => null)) file = null;
      let mime = m.mimeType, name = m.nome;
      const recent = cache.get(p.mensagemId);
      if (!file && recent && recent.until > Date.now() && await stat(recent.path).catch(() => null)) {
        file = recent.path; mime = recent.mime; name = recent.name;
      }
      // Older attachments remain readable; no file bytes travel through Vercel.
      if (!file && m.dados?.length) {
        await salvarArquivo(p.mensagemId, m.dados);
        file = caminhoArquivo(p.mensagemId);
        cache.set(p.mensagemId, { path: file, mime, name, until: Date.now() + 600000 });
      }
      if (!file) {
        let cached = cache.get(p.mensagemId);
        if (cached && cached.until < Date.now()) { cache.delete(p.mensagemId); cached = null; }
        if (!cached) {
          const connection = getClient();
          if (!connection || connection.conta !== m.conta) throw new Error('O WhatsApp da empresa está desconectado.');
          if (!m.externaId) throw new Error('Este anexo ainda não foi enviado ou o arquivo temporário expirou.');
          if (downloading) { res.writeHead(429); res.end('Outro arquivo está sendo preparado. Tente novamente em alguns segundos.'); return; }
          downloading = true;
          try {
            const message = await connection.client.getMessageById(m.externaId);
            if (Number(message?.rawData?.size) > LIMITE_MIDIA) throw new Error('Este arquivo ultrapassa o limite de 90 MB.');
            const media = await message?.downloadMedia();
            if (!media?.data) throw new Error('O WhatsApp não disponibiliza mais este arquivo. Peça ao cliente para reenviar.');
            if (media.data.length > Math.ceil(LIMITE_MIDIA * 4 / 3) + 4) throw new Error('Este arquivo ultrapassa o limite de 90 MB.');
            const data = Buffer.from(media.data, 'base64');
            await espacoDisponivel(data.length);
            await salvarArquivo(p.mensagemId, data);
            cached = { path: caminhoArquivo(p.mensagemId), mime: media.mimetype.split(';')[0], name: nomeArquivo(media.filename || m.nome), until: Date.now() + 600000 };
            cache.set(p.mensagemId, cached);
          } finally { downloading = false; }
        }
        file = cached.path; mime = cached.mime; name = cached.name;
      }
      const { size } = await stat(file);
      const inline = /^(image\/(jpeg|png|webp|gif)|audio\/(mpeg|mp4|ogg|wav|webm)|video\/(mp4|webm|quicktime))$/.test(mime);
      res.setHeader('Content-Type', inline ? mime : 'application/octet-stream');
      res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`);
      res.setHeader('Accept-Ranges', 'bytes');
      let start = 0, end = size - 1;
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (match && (match[1] || match[2])) {
          start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
          end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        } else start = -1;
        if (start < 0 || start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
        res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      }
      res.setHeader('Content-Length', end - start + 1);
      await pipeline(createReadStream(file, { start, end }), res);
    } catch (error) {
      if (!res.headersSent && !res.destroyed) { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(error?.code ? 'Não foi possível transferir o arquivo. Tente novamente.' : error.message); }
      else res.destroy();
    }
  });
  server.requestTimeout = 300000;
  server.headersTimeout = 15000;
  return { start: () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); }),
    stop: () => { clearInterval(cleanup); server.closeAllConnections(); server.close(); } };
}
