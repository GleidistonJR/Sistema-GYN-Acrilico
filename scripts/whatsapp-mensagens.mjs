import whatsapp from 'whatsapp-web.js';
import { lerArquivo, salvarArquivo, removerAposEnvio } from './whatsapp-arquivos.mjs';
import { criarFilaPrioritaria } from './whatsapp-fila.mjs';
import { converterVoz } from './whatsapp-audio.mjs';
import { prepararMidiaRecente } from './whatsapp-previas.mjs';
import { obterCitacao } from '../lib/whatsapp/citacao.mjs';
import { telefoneDoJid, variantesTelefone, nomeArquivo, statusAck } from '../lib/whatsapp/conteudo.mjs';

export function criarServicoMensagens({ prisma, client, conta, ativo, retryDelayMs = 5000 }) {
  const fila = criarFilaPrioritaria();
  let timer;
  let stopped = false;
  let waking = false;
  let wakePending = false;
  let lastSync = 0;
  let lastClient = '';
  const synchronizing = new Map();
  const destinos = new Map();
  const recebimentos = new Map();
  const log = error => console.error('Falha no histórico WhatsApp:', error?.code || error?.name || 'erro',
    error?.code === 'P2028' ? String(error.meta?.error || '').slice(0, 300) : '');
  const enqueue = (operation, priority = 1) => {
    const work = fila.enqueue(() => stopped || !ativo() ? undefined : operation(), priority);
    void work.catch(log);
    return work;
  };

  async function identificar(jid, preferredId) {
    if (!/^\d+@(c\.us|lid)$/.test(jid)) return null;
    const known = await prisma.identidadeWhatsApp.findUnique({ where: { conta_jid: { conta, jid } } });
    if (known) return known.clienteId;
    let aliases = [jid];
    let phone = telefoneDoJid(jid);
    try {
      const [mapping] = await client.getContactLidAndPhone([jid]);
      if (mapping) {
        aliases = [...new Set([jid, mapping.lid, mapping.pn].filter(value => /^\d+@(c\.us|lid)$/.test(value)))];
        phone = telefoneDoJid(mapping.pn) || phone;
      }
    } catch { /* A LID must never be mistaken for a phone number. */ }
    let existing = preferredId ? await prisma.cliente.findUnique({ where: { id: preferredId } }) : null;
    if (!existing) {
      const identity = await prisma.identidadeWhatsApp.findFirst({ where: { conta, jid: { in: aliases } } });
      if (identity) existing = await prisma.cliente.findUnique({ where: { id: identity.clienteId } });
    }
    if (!existing && phone) {
      existing = await prisma.cliente.findUnique({ where: { telefone: phone } });
      if (!existing) {
        const matches = await prisma.cliente.findMany({ where: { telefone: { in: variantesTelefone(phone) } }, take: 2 });
        if (matches.length === 1) existing = matches[0];
      }
    }
    if (!existing) {
      let name = phone || 'Contato WhatsApp';
      try { const contact = await client.getContactById(jid); name = contact.pushname || contact.name || name; } catch { /* optional display name */ }
      existing = phone ? await prisma.cliente.upsert({ where: { telefone: phone }, create: { nome: name.slice(0, 120), telefone: phone }, update: {} })
        : await prisma.cliente.create({ data: { nome: name.slice(0, 120) } });
    }
    for (const alias of aliases) await prisma.identidadeWhatsApp.upsert({
      where: { conta_jid: { conta, jid: alias } }, create: { conta, jid: alias, clienteId: existing.id }, update: {},
    });
    return existing.id;
  }

  function metadadosMidia(message) {
    let media;
    if (message.hasMedia || ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(message.type)) {
      const fallback = { image: 'image/jpeg', sticker: 'image/webp', video: 'video/mp4', audio: 'audio/mpeg', ptt: 'audio/ogg' };
      const mimeType = String(message.rawData?.mimetype || fallback[message.type] || 'application/octet-stream').split(';')[0];
      media = { dados: Buffer.alloc(0), mimeType, nome: nomeArquivo(message.rawData?.filename || 'arquivo.' + (mimeType.split('/')[1] || 'bin')) };
    }
    return media;
  }

  async function receber(message) {
    if (message.isStatus || message.broadcast || !message.id?._serialized) return;
    const jid = message.fromMe ? message.to : message.from;
    if (!/^\d+@(c\.us|lid)$/.test(jid)) return;
    const external = { conta, externaId: message.id._serialized };
    const exists = await prisma.mensagemWhatsApp.findUnique({ where: { conta_externaId: external }, select: { id: true, citacao: true, midia: { select: { mensagemId: true } } } });
    if (exists) {
      const media = !exists.midia && metadadosMidia(message);
      if (media) {
        await prisma.midiaWhatsApp.upsert({ where: { mensagemId: exists.id }, create: { mensagemId: exists.id, ...media }, update: {} });
        await prisma.mensagemWhatsApp.updateMany({ where: { id: exists.id, erro: { startsWith: 'Anexo indisponível' } }, data: { erro: null } });
      }
      if (message.hasQuotedMsg && !exists.citacao) {
        await prisma.mensagemWhatsApp.update({ where: { id: exists.id }, data: { citacao: await obterCitacao(message) } });
      }
      return confirmar(message, message.ack);
    }
    const clienteId = await identificar(jid);
    if (!clienteId) return;
    const timestamp = Number(message.timestamp);
    const enviadoEm = Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000) : new Date();
    const data = { ...external, clienteId, direcao: message.fromMe ? 'SAIDA' : 'ENTRADA', tipo: message.type || 'chat',
      texto: String(message.body || '').slice(0, 65536), enviadoEm, ack: Math.max(0, Number(message.ack) || 0),
      status: message.fromMe ? statusAck(message.ack) : 'RECEBIDA',
      ...(message.hasQuotedMsg ? { citacao: await obterCitacao(message) } : {}),
    };
    const media = metadadosMidia(message);
    await prisma.$transaction(async tx => {
      const [cliente] = await tx.$queryRaw`SELECT "conversaExcluidaEm" FROM "Cliente" WHERE id = ${clienteId} FOR UPDATE`;
      if (!cliente || (cliente.conversaExcluidaEm && enviadoEm <= cliente.conversaExcluidaEm)) return;
      await tx.mensagemWhatsApp.upsert({ where: { conta_externaId: external }, create: { ...data, ...(media ? { midia: { create: media } } : {}) }, update: {} });
      await tx.cliente.updateMany({ where: { id: clienteId, OR: [{ ultimaMensagemEm: null }, { ultimaMensagemEm: { lt: enviadoEm } }] }, data: { ultimaMensagemEm: enviadoEm } });
    }, { timeout: 15000 });
  }

  async function confirmar(message, ack) {
    if (!Number.isInteger(ack) || !message.id?._serialized) return;
    if (ack < 0) {
      await prisma.mensagemWhatsApp.updateMany({ where: { conta, externaId: message.id._serialized, direcao: 'SAIDA', ack: { lte: 0 } }, data: { status: 'FALHOU', erro: 'O WhatsApp não confirmou o envio.' } });
    } else await prisma.mensagemWhatsApp.updateMany({ where: { conta, externaId: message.id._serialized, direcao: 'SAIDA', ack: { lt: ack } }, data: { ack, status: statusAck(ack), erro: null } });
  }

  async function destino(cliente) {
    const cacheKey = cliente.id + ':' + (cliente.telefone || '');
    const cached = destinos.get(cacheKey);
    if (cached && cached.until > Date.now()) return cached.jid;
    const remember = jid => {
      if (destinos.size >= 500) destinos.delete(destinos.keys().next().value);
      destinos.set(cacheKey, { jid, until: Date.now() + 120000 });
      return jid;
    };
    if (cliente.telefone) {
      // Reuse verified identities instead of querying WhatsApp on every send.
      const known = await prisma.identidadeWhatsApp.findFirst({ where: { conta, clienteId: cliente.id,
        jid: { in: variantesTelefone(cliente.telefone).map(phone => phone.replace(/\D/g, '') + '@c.us') },
      } });
      if (known) return remember(known.jid);
      const id = await client.getNumberId(cliente.telefone.replace(/\D/g, ''));
      if (!id?._serialized) throw new Error('Este número não está disponível no WhatsApp. Confira país e DDD.');
      const mapped = await identificar(id._serialized, cliente.id);
      if (mapped !== cliente.id) throw new Error('Este WhatsApp está vinculado a outro cadastro. Revise os clientes duplicados.');
      return remember(id._serialized);
    }
    const identity = await prisma.identidadeWhatsApp.findFirst({ where: { clienteId: cliente.id, conta } });
    if (!identity) throw new Error('Cliente sem identidade válida do WhatsApp.');
    return remember(identity.jid);
  }

  async function sincronizarHistorico(clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return;
    const jid = await destino(cliente);
    const chat = await client.getChatById(jid);
    const messages = await chat.fetchMessages({ limit: 50 });
    const existing = await prisma.mensagemWhatsApp.findMany({ where: { conta, externaId: { in: messages.map(m => m.id._serialized) } }, select: { externaId: true, ack: true, citacao: true, midia: { select: { mensagemId: true } } } });
    const known = new Map(existing.map(m => [m.externaId, m]));
    for (const message of messages) {
      if (stopped) return;
      if (cliente.conversaExcluidaEm && message.timestamp * 1000 <= +cliente.conversaExcluidaEm) continue;
      const previous = known.get(message.id._serialized);
      if (previous && !(metadadosMidia(message) && !previous.midia) && !(message.hasQuotedMsg && !previous.citacao) && (!message.fromMe || (message.ack >= 0 && message.ack <= previous.ack))) continue;
      // Yield between history items so newly arriving messages are never stuck behind the whole import.
      try { await enqueue(() => receber(message), 2); }
      catch { agendarRecebimento(message, 2); }
    }
  }

  function sincronizar(clienteId) {
    if (synchronizing.has(clienteId)) return synchronizing.get(clienteId);
    const job = sincronizarHistorico(clienteId).finally(() => synchronizing.delete(clienteId));
    synchronizing.set(clienteId, job);
    return job;
  }

  async function enviarPendentes() {
    // Fetch the small queue batch and attachments together instead of three remote queries.
    const pending = await prisma.$queryRaw`
      SELECT m.*, a.dados AS "dadosMidia", f.chave AS "chaveArquivo", json_build_object('id', c.id, 'telefone', c.telefone, 'responsavelId', c."responsavelId") AS cliente,
        CASE WHEN a."mensagemId" IS NULL THEN NULL ELSE json_build_object(
          'mimeType', a."mimeType", 'nome', a.nome
        ) END AS midia
      FROM "MensagemWhatsApp" m JOIN "Cliente" c ON c.id = m."clienteId"
      LEFT JOIN "MidiaWhatsApp" a ON a."mensagemId" = m.id
      LEFT JOIN "ArquivoWhatsApp" f ON f."mensagemId" = m.id
      WHERE m.conta = ${conta} AND m.status = 'PENDENTE' AND m.direcao = 'SAIDA'
      ORDER BY m."createdAt" ASC LIMIT 5`;
    for (const message of pending) {
      if (!ativo() || stopped) return;
      if (message.midia) message.midia.dados = message.dadosMidia;
      let jid;
      try { jid = await destino(message.cliente); }
      catch (error) { await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: { status: 'FALHOU', erro: error.message } }); continue; }
      // Lock the customer and claim atomically in one DB round trip, preserving permissions
      // and preventing two workers from transmitting the same pending message.
      const claimed = await prisma.$queryRaw`
        WITH dono AS MATERIALIZED (
          SELECT id, "responsavelId" FROM "Cliente" WHERE id = ${message.clienteId} FOR UPDATE
        ), permitido AS (
          SELECT 1 FROM dono JOIN "User" u ON u.id = ${message.autorId}
          WHERE u.role IN ('ADMIN', 'USER', 'RECEPCAO')
        )
        UPDATE "MensagemWhatsApp" SET
          status = CASE WHEN EXISTS (SELECT 1 FROM permitido) THEN 'ENVIANDO' ELSE 'FALHOU' END,
          erro = CASE WHEN EXISTS (SELECT 1 FROM permitido) THEN NULL ELSE 'O usuário não tem mais permissão para responder.' END,
          "updatedAt" = NOW()
        WHERE id = ${message.id} AND status = 'PENDENTE' AND EXISTS (SELECT 1 FROM dono)
        RETURNING status`;
      if (claimed[0]?.status !== 'ENVIANDO') continue;
      let payload;
      try {
        if (message.chaveArquivo) message.midia.dados = await lerArquivo(message.chaveArquivo);
        if (message.midia && !message.midia.dados?.length) throw new Error("Anexo temporário indisponível.");
        if (message.midia && message.tipo === 'ptt') {
          const dados = await converterVoz(Buffer.from(message.midia.dados));
          message.midia = { dados, mimeType: 'audio/mpeg', nome: 'gravacao.mp3' };
          // Keep exactly the transmitted file, not the original browser recording.
          if (message.chaveArquivo) await salvarArquivo(message.chaveArquivo, dados);
          await prisma.midiaWhatsApp.update({ where: { mensagemId: message.id }, data: { dados: message.chaveArquivo ? Buffer.alloc(0) : dados, mimeType: 'audio/mpeg', nome: 'gravacao.mp3' } });
          payload = new whatsapp.MessageMedia('audio/mpeg', dados.toString('base64'), 'gravacao.mp3');
        } else payload = message.midia ? new whatsapp.MessageMedia(message.midia.mimeType, Buffer.from(message.midia.dados).toString('base64'), message.midia.nome) : message.texto;
      } catch {
        await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: { status: 'FALHOU', erro: 'O anexo temporário não pôde ser preparado ou expirou. Nenhuma mensagem foi enviada. Anexe novamente.' } });
        continue;
      }
      // Do not retry an ambiguous send automatically: WhatsApp may have accepted it.
      try {
        const sent = await client.sendMessage(jid, payload, { sendSeen: false,
          ...(message.citacao?.externaId ? { quotedMessageId: message.citacao.externaId, ignoreQuoteErrors: false } : {}),
          ...(message.midia ? { caption: message.texto, sendMediaAsDocument: message.midia.mimeType === 'application/pdf' || (message.midia.mimeType.startsWith('video/') && message.midia.dados.length > 60 * 1024 * 1024), sendAudioAsVoice: false } : {}) });
        if (!sent?.id?._serialized) throw new Error('Confirmação ausente');
        if (message.midia) {
          const { dados, mimeType, nome } = message.midia;
          await prepararMidiaRecente(prisma, message, dados, mimeType, nome).catch(log);
        }
        await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: { externaId: sent.id._serialized, ...(message.tipo === 'ptt' ? { tipo: 'audio' } : {}), status: statusAck(sent.ack), ack: Math.max(0, sent.ack || 0), erro: null } });
        if (message.chaveArquivo) removerAposEnvio(message.chaveArquivo);
      } catch (error) {
        const quoteUnavailable = error?.code === 'QUOTE_UNAVAILABLE' || String(error?.message).includes('Could not get the quoted message.');
        await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: {
          status: quoteUnavailable ? 'FALHOU' : 'INCERTO',
          erro: quoteUnavailable ? 'A mensagem citada não está mais disponível no WhatsApp. Nenhuma resposta foi enviada. Selecione outra mensagem.' : 'Envio sem confirmação. Confira o histórico antes de enviar novamente para evitar duplicidade.',
        } });
      }
    }
    return pending.length === 5;
  }

  function agendarRecebimento(message, priority = 1) {
    const key = message.id?._serialized;
    if (!key || stopped || recebimentos.has(key)) return;
    const entry = { timer: null, attempts: 0 };
    recebimentos.set(key, entry);
    function attempt() {
      if (stopped) return;
      void enqueue(() => receber(message), priority).then(() => recebimentos.delete(key)).catch(() => {
        if (!stopped) entry.timer = setTimeout(attempt, Math.min(60000, retryDelayMs * 2 ** Math.min(entry.attempts++, 4)));
      });
    }
    attempt();
  }
  // Retrying persistence is safe because the account/external ID is unique.
  // Backoff happens outside the serial queue so it never holds outgoing messages.
  const onMessage = message => agendarRecebimento(message, message.hasMedia ? 2 : 1);
  const onAck = (message, ack) => { void enqueue(() => confirmar(message, ack)).catch(() => {}); };
  client.on('message_create', onMessage);
  client.on('message_ack', onAck);

  function acordarEnvios(account) {
    if (stopped || (account && account !== conta)) return;
    if (waking) { wakePending = true; return; }
    waking = true;
    void enqueue(enviarPendentes, 0).then(more => { if (more) wakePending = true; }).catch(log).finally(() => {
      waking = false;
      if (wakePending) { wakePending = false; acordarEnvios(); }
    });
  }

  async function tick() {
    try {
      acordarEnvios();
      if (!synchronizing.size && Date.now() - lastSync > 120000) {
        lastSync = Date.now();
        const next = await prisma.cliente.findFirst({ where: { id: { gt: lastClient } }, orderBy: { id: 'asc' } });
        if (next) { lastClient = next.id; void sincronizar(next.id).catch(log); }
        else lastClient = '';
      }
    } catch (error) { log(error); }
    if (!stopped) timer = setTimeout(tick, 30000);
  }

  return {
    receber, confirmar, identificar, acordarEnvios, enviarPendentes: () => enqueue(enviarPendentes, 0),
    drain: () => fila.drain(),
    sincronizar,
    async start() {
      await prisma.mensagemWhatsApp.updateMany({ where: { conta, status: 'ENVIANDO' }, data: { status: 'INCERTO', erro: 'A conexão reiniciou durante o envio. Confira o histórico antes de reenviar.' } });
      void tick();
      // Map registered numbers before importing history, preserving their owners.
      const customers = await prisma.cliente.findMany({ select: { id: true }, orderBy: { ultimaMensagemEm: { sort: 'desc', nulls: 'last' } }, take: 100 });
      for (const customer of customers) {
        if (stopped) break;
        await sincronizar(customer.id).catch(log);
      }
    },
    async stop() { stopped = true; clearTimeout(timer); for (const entry of recebimentos.values()) clearTimeout(entry.timer); recebimentos.clear(); client.off('message_create', onMessage); client.off('message_ack', onAck); await Promise.allSettled([...synchronizing.values()]); await fila.drain(); },
  };
}
