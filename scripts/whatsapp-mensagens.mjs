import whatsapp from 'whatsapp-web.js';
import { converterVoz } from './whatsapp-audio.mjs';
import { obterCitacao } from '../lib/whatsapp/citacao.mjs';
import { telefoneDoJid, variantesTelefone, nomeArquivo, validarMidia, LIMITE_MIDIA, statusAck } from '../lib/whatsapp/conteudo.mjs';

export function criarServicoMensagens({ prisma, client, conta, ativo }) {
  let chain = Promise.resolve();
  let timer;
  let stopped = false;
  let waking = false;
  let wakePending = false;
  let lastSync = 0;
  let lastClient = '';
  const synchronizing = new Map();
  const log = error => console.error('Falha no histórico WhatsApp:', error?.code || error?.name || 'erro');
  const enqueue = operation => {
    const work = chain.then(() => stopped || !ativo() ? undefined : operation());
    chain = work.catch(log);
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

  async function receber(message) {
    if (message.isStatus || message.broadcast || !message.id?._serialized) return;
    const jid = message.fromMe ? message.to : message.from;
    if (!/^\d+@(c\.us|lid)$/.test(jid)) return;
    const external = { conta, externaId: message.id._serialized };
    const exists = await prisma.mensagemWhatsApp.findUnique({ where: { conta_externaId: external }, select: { id: true, citacao: true } });
    if (exists) {
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
    let media;
    if (message.hasMedia) {
      try {
        if (Number(message.rawData?.size) > LIMITE_MIDIA) throw new Error('Arquivo acima de 10 MB.');
        const downloaded = await message.downloadMedia();
        if (!downloaded?.data || downloaded.data.length > Math.ceil(LIMITE_MIDIA * 4 / 3) + 4) throw new Error('Arquivo indisponível ou acima de 10 MB.');
        const dados = Buffer.from(downloaded.data, 'base64');
        const mimeType = validarMidia(dados, downloaded.mimetype);
        const extension = mimeType === 'application/pdf' ? '.pdf' : '.' + mimeType.split('/')[1];
        media = { dados, mimeType, nome: nomeArquivo(downloaded.filename || 'arquivo' + extension) };
      } catch { data.erro = 'Anexo indisponível, acima de 10 MB ou em formato não suportado. Consulte o WhatsApp no celular.'; }
    }
    await prisma.$transaction(async tx => {
      await tx.mensagemWhatsApp.upsert({ where: { conta_externaId: external }, create: { ...data, ...(media ? { midia: { create: media } } : {}) }, update: {} });
      await tx.cliente.updateMany({ where: { id: clienteId, OR: [{ ultimaMensagemEm: null }, { ultimaMensagemEm: { lt: enviadoEm } }] }, data: { ultimaMensagemEm: enviadoEm } });
    });
  }

  async function confirmar(message, ack) {
    if (!Number.isInteger(ack) || !message.id?._serialized) return;
    if (ack < 0) {
      await prisma.mensagemWhatsApp.updateMany({ where: { conta, externaId: message.id._serialized, direcao: 'SAIDA', ack: { lte: 0 } }, data: { status: 'FALHOU', erro: 'O WhatsApp não confirmou o envio.' } });
    } else await prisma.mensagemWhatsApp.updateMany({ where: { conta, externaId: message.id._serialized, direcao: 'SAIDA', ack: { lt: ack } }, data: { ack, status: statusAck(ack), erro: null } });
  }

  async function destino(cliente) {
    if (cliente.telefone) {
      const id = await client.getNumberId(cliente.telefone.replace(/\D/g, ''));
      if (!id?._serialized) throw new Error('Este número não está disponível no WhatsApp. Confira país e DDD.');
      const mapped = await identificar(id._serialized, cliente.id);
      if (mapped !== cliente.id) throw new Error('Este WhatsApp está vinculado a outro cadastro. Revise os clientes duplicados.');
      return id._serialized;
    }
    const identity = await prisma.identidadeWhatsApp.findFirst({ where: { clienteId: cliente.id, conta } });
    if (!identity) throw new Error('Cliente sem identidade válida do WhatsApp.');
    return identity.jid;
  }

  async function sincronizarHistorico(clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return;
    const jid = await destino(cliente);
    const chat = await client.getChatById(jid);
    const messages = await chat.fetchMessages({ limit: 50 });
    const existing = await prisma.mensagemWhatsApp.findMany({ where: { conta, externaId: { in: messages.map(m => m.id._serialized) } }, select: { externaId: true, ack: true, citacao: true } });
    const known = new Map(existing.map(m => [m.externaId, m]));
    for (const message of messages) {
      if (stopped) return;
      const previous = known.get(message.id._serialized);
      if (previous && !(message.hasQuotedMsg && !previous.citacao) && (!message.fromMe || (message.ack >= 0 && message.ack <= previous.ack))) continue;
      // Yield between history items so newly arriving messages are never stuck behind the whole import.
      await enqueue(() => receber(message));
    }
  }

  function sincronizar(clienteId) {
    if (synchronizing.has(clienteId)) return synchronizing.get(clienteId);
    const job = sincronizarHistorico(clienteId).finally(() => synchronizing.delete(clienteId));
    synchronizing.set(clienteId, job);
    return job;
  }

  async function enviarPendentes() {
    const pending = await prisma.mensagemWhatsApp.findMany({ where: { conta, status: 'PENDENTE', direcao: 'SAIDA' }, orderBy: { createdAt: 'asc' }, take: 5, include: { cliente: true, midia: true } });
    for (const message of pending) {
      if (!ativo() || stopped) return;
      let jid;
      try { jid = await destino(message.cliente); }
      catch (error) { await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: { status: 'FALHOU', erro: error.message } }); continue; }
      const claimed = await prisma.$transaction(async tx => {
        const owner = await tx.cliente.updateMany({ where: { id: message.clienteId, responsavelId: message.cliente.responsavelId }, data: { updatedAt: new Date() } });
        if (!owner.count) return false;
        const author = message.autorId ? await tx.user.findUnique({ where: { id: message.autorId }, select: { role: true } }) : null;
        if (!author || (author.role !== 'ADMIN' && !(author.role === 'USER' && (message.cliente.responsavelId === null || message.cliente.responsavelId === message.autorId)))) {
          await tx.mensagemWhatsApp.update({ where: { id: message.id }, data: { status: 'FALHOU', erro: 'O vendedor não é mais responsável por este cliente.' } });
          return false;
        }
        return (await tx.mensagemWhatsApp.updateMany({ where: { id: message.id, status: 'PENDENTE' }, data: { status: 'ENVIANDO' } })).count === 1;
      });
      if (!claimed) continue;
      let payload;
      try {
        if (message.midia && message.tipo === 'ptt') {
          const dados = await converterVoz(Buffer.from(message.midia.dados));
          // Keep exactly the transmitted file, not the original browser recording.
          await prisma.midiaWhatsApp.update({ where: { mensagemId: message.id }, data: { dados, mimeType: 'audio/mpeg', nome: 'gravacao.mp3' } });
          payload = new whatsapp.MessageMedia('audio/mpeg', dados.toString('base64'), 'gravacao.mp3');
        } else payload = message.midia ? new whatsapp.MessageMedia(message.midia.mimeType, Buffer.from(message.midia.dados).toString('base64'), message.midia.nome) : message.texto;
      } catch {
        await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: { status: 'FALHOU', erro: 'O áudio não pôde ser preparado. Nenhuma mensagem foi enviada. Grave novamente.' } });
        continue;
      }
      // Do not retry an ambiguous send automatically: WhatsApp may have accepted it.
      try {
        const sent = await client.sendMessage(jid, payload, { sendSeen: false,
          ...(message.citacao?.externaId ? { quotedMessageId: message.citacao.externaId, ignoreQuoteErrors: false } : {}),
          ...(message.midia ? { caption: message.texto, sendMediaAsDocument: message.midia.mimeType === 'application/pdf', sendAudioAsVoice: false } : {}) });
        if (!sent?.id?._serialized) throw new Error('Confirmação ausente');
        await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: { externaId: sent.id._serialized, ...(message.tipo === 'ptt' ? { tipo: 'audio' } : {}), status: statusAck(sent.ack), ack: Math.max(0, sent.ack || 0), erro: null } });
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

  const onMessage = message => { void enqueue(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await receber(message); return; }
      catch (error) {
        if (attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }).catch(() => {}); };
  const onAck = (message, ack) => { void enqueue(() => confirmar(message, ack)).catch(() => {}); };
  client.on('message_create', onMessage);
  client.on('message_ack', onAck);

  function acordarEnvios(account) {
    if (stopped || (account && account !== conta)) return;
    if (waking) { wakePending = true; return; }
    waking = true;
    void enqueue(enviarPendentes).then(more => { if (more) wakePending = true; }).catch(log).finally(() => {
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
    receber, confirmar, identificar, acordarEnvios, enviarPendentes: () => enqueue(enviarPendentes),
    drain: () => chain,
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
    async stop() { stopped = true; clearTimeout(timer); client.off('message_create', onMessage); client.off('message_ack', onAck); await Promise.allSettled([...synchronizing.values()]); await chain; },
  };
}
