import whatsapp from 'whatsapp-web.js';
import { setTimeout as esperar } from 'node:timers/promises';
import { lerArquivo, salvarArquivo, removerAposEnvio } from './whatsapp-arquivos.mjs';
import { criarFilaPrioritaria } from './whatsapp-fila.mjs';
import { converterVoz } from './whatsapp-audio.mjs';
import { obterCitacao } from '../lib/whatsapp/citacao.mjs';
import { telefoneDoJid, variantesTelefone, nomeArquivo, statusAck, tiposAvisoInternoWhatsApp } from '../lib/whatsapp/conteudo.mjs';

export function criarServicoMensagens({ prisma, client, conta, ativo, retryDelayMs = 5000, prazoEnvioMs = 120000, recuperar = () => {} }) {
  const fila = criarFilaPrioritaria();
  let timer;
  let stopped = false;
  const envios = [{ midia: false, job: null, avisado: false }, { midia: true, job: null, avisado: false }];
  const enviosEmTransmissao = new Set();
  const confirmacoes = new Map();
  const revogacoes = new Map();
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

  async function registrarTamanho(db, mensagemId, message) {
    const tamanho = Number(message.rawData?.size);
    if (!Number.isSafeInteger(tamanho) || tamanho <= 0 || tamanho > 2147483647) return;
    await db.$executeRaw`UPDATE "MidiaWhatsApp" SET tamanho = ${tamanho} WHERE "mensagemId" = ${mensagemId} AND tamanho IS NULL`;
  }

  async function receber(message) {
    if (tiposAvisoInternoWhatsApp.includes(message.type)) return;
    if (message.isStatus || message.broadcast || !message.id?._serialized) return;
    const jid = message.fromMe ? message.to : message.from;
    if (!/^\d+@(c\.us|lid)$/.test(jid)) return;
    const external = { conta, externaId: message.id._serialized };
    const exists = await prisma.mensagemWhatsApp.findUnique({ where: { conta_externaId: external }, select: { id: true, status: true, citacao: true, midia: { select: { mensagemId: true } } } });
    if (exists?.status === 'APAGADA' || message.type === 'revoked') return;
    if (exists) {
      const media = !exists.midia && metadadosMidia(message);
      if (media) {
        await prisma.midiaWhatsApp.upsert({ where: { mensagemId: exists.id }, create: { mensagemId: exists.id, ...media }, update: {} });
        await registrarTamanho(prisma, exists.id, message);
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
      const gravada = await tx.mensagemWhatsApp.upsert({ where: { conta_externaId: external }, create: { ...data, ...(media ? { midia: { create: media } } : {}) }, update: {} });
      if (media) await registrarTamanho(tx, gravada.id, message);
      await tx.cliente.updateMany({ where: { id: clienteId, OR: [{ ultimaMensagemEm: null }, { ultimaMensagemEm: { lt: enviadoEm } }] }, data: { ultimaMensagemEm: enviadoEm } });
    }, { timeout: 15000 });
  }

  async function confirmar(message, ack) {
    if (!Number.isInteger(ack) || !message.id?._serialized) return;
    const externo = message.id._serialized;
    const medicao = confirmacoes.get(externo);
    if (ack >= 1 && medicao) {
      confirmacoes.delete(externo);
      console.info('WhatsApp confirmação', { tipo: medicao.tipo, confirmacaoMs: Date.now() - medicao.retorno, ack });
    }
    if (ack < 0) {
      await prisma.mensagemWhatsApp.updateMany({ where: { conta, externaId: message.id._serialized, direcao: 'SAIDA', status: { not: 'APAGADA' }, ack: { lte: 0 } }, data: { status: 'FALHOU', erro: 'O WhatsApp não confirmou o envio.' } });
    } else await prisma.mensagemWhatsApp.updateMany({ where: { conta, externaId: message.id._serialized, direcao: 'SAIDA', status: { not: 'APAGADA' }, ack: { lt: ack } }, data: { ack, status: statusAck(ack), erro: null } });
  }

  function apagarParaTodos(id) {
    const atual = revogacoes.get(id);
    if (atual) return atual;
    const tarefa = enqueue(async () => {
      const mensagem = await prisma.mensagemWhatsApp.findFirst({ where: { id, conta, direcao: 'SAIDA', externaId: { not: null } } });
      if (!mensagem || !mensagem.externaId) return false;
      if (mensagem.status === 'APAGADA') return true;
      if (!await client.revogarMensagem(mensagem.externaId)) return false;
      await prisma.$transaction(async tx => {
        await tx.$executeRaw`UPDATE "MensagemWhatsApp" SET status = 'APAGADA', texto = '', citacao = NULL, erro = NULL, "updatedAt" = NOW() WHERE id = ${id}`;
        await tx.midiaWhatsApp.deleteMany({ where: { mensagemId: id } });
        await tx.$executeRaw`UPDATE "MensagemWhatsApp" SET citacao = jsonb_set(citacao, '{texto}', '"Mensagem apagada"'::jsonb)
          WHERE conta = ${conta} AND "clienteId" = ${mensagem.clienteId} AND citacao->>'externaId' = ${mensagem.externaId}`;
      });
      return true;
    }, 0).finally(() => revogacoes.delete(id));
    revogacoes.set(id, tarefa);
    return tarefa;
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
      try { await aguardarEnvio(message); await enqueue(() => receber(message), 2); }
      catch { agendarRecebimento(message, 2); }
    }
  }

  function sincronizar(clienteId) {
    if (synchronizing.has(clienteId)) return synchronizing.get(clienteId);
    const job = sincronizarHistorico(clienteId).finally(() => synchronizing.delete(clienteId));
    synchronizing.set(clienteId, job);
    return job;
  }

  async function enviarPendentes(midia) {
    const pending = await prisma.$queryRaw`
      SELECT m.*, a.dados AS "dadosMidia", f.chave AS "chaveArquivo", json_build_object('id', c.id, 'telefone', c.telefone, 'responsavelId', c."responsavelId") AS cliente,
        CASE WHEN a."mensagemId" IS NULL THEN NULL ELSE json_build_object(
          'mimeType', a."mimeType", 'nome', a.nome
        ) END AS midia
      FROM "MensagemWhatsApp" m JOIN "Cliente" c ON c.id = m."clienteId"
      LEFT JOIN "MidiaWhatsApp" a ON a."mensagemId" = m.id
      LEFT JOIN "ArquivoWhatsApp" f ON f."mensagemId" = m.id
      WHERE m.conta = ${conta} AND m.status = 'PENDENTE' AND m.direcao = 'SAIDA'
        AND (a."mensagemId" IS NOT NULL) = ${midia}
        AND NOT EXISTS (
          SELECT 1 FROM "MensagemWhatsApp" anterior
          WHERE anterior.conta = m.conta AND anterior."clienteId" = m."clienteId" AND anterior.direcao = 'SAIDA'
            AND (anterior.status = 'ENVIANDO' OR (anterior.status = 'PENDENTE'
              AND (anterior."createdAt", anterior.id) < (m."createdAt", m.id)))
        )
      ORDER BY m."createdAt", m.id LIMIT 1`;
    for (const message of pending) {
      if (!ativo() || stopped) return;
      const selecionadoEm = Date.now();
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
        } else if (message.midia) {
          const { dados, mimeType, nome } = message.midia;
          payload = new whatsapp.MessageMedia(mimeType, Buffer.from(dados.buffer, dados.byteOffset, dados.byteLength).toString('base64'), nome);
        } else payload = message.texto;
      } catch {
        await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: { status: 'FALHOU', erro: 'O anexo temporário não pôde ser preparado ou expirou. Nenhuma mensagem foi enviada. Anexe novamente.' } });
        continue;
      }
      const inicioEnvio = Date.now();
      let liberarEco;
      let concluido = false;
      const envio = new Promise(resolve => { liberarEco = resolve; });
      const transmissao = { envio, get concluido() { return concluido; } };
      enviosEmTransmissao.add(transmissao);
      const prazo = new AbortController();
      let expirou = false;
      // Do not retry an ambiguous send automatically: WhatsApp may have accepted it.
      try {
        const sent = await Promise.race([client.sendMessage(jid, payload, { sendSeen: false,
          ...(message.citacao?.externaId ? { quotedMessageId: message.citacao.externaId, ignoreQuoteErrors: false } : {}),
          ...(message.midia ? { caption: message.texto, sendMediaAsDocument: message.midia.mimeType === 'application/pdf' || (message.midia.mimeType.startsWith('video/') && message.midia.dados.length > 60 * 1024 * 1024), sendAudioAsVoice: false } : {}) }),
          esperar(prazoEnvioMs, undefined, { signal: prazo.signal, ref: false }).then(() => {
            expirou = true;
            throw new Error('Prazo de envio excedido.');
          }),
        ]);
        prazo.abort();
        if (!sent?.id?._serialized) throw new Error('Confirmação ausente');
        const retorno = Date.now();
        console.info('WhatsApp envio', { tipo: message.tipo, bytes: message.midia?.dados.length ?? 0,
          filaMs: Math.max(0, selecionadoEm - +message.createdAt),
          preparacaoMs: inicioEnvio - selecionadoEm, envioMs: retorno - inicioEnvio });
        if (sent.ack >= 1) {
          console.info('WhatsApp confirmação', { tipo: message.tipo, confirmacaoMs: 0, ack: sent.ack });
        } else {
          if (confirmacoes.size >= 500) confirmacoes.delete(confirmacoes.keys().next().value);
          confirmacoes.set(sent.id._serialized, { tipo: message.tipo, retorno });
        }
        await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: { externaId: sent.id._serialized, ...(message.tipo === 'ptt' ? { tipo: 'audio' } : {}), status: statusAck(sent.ack), ack: Math.max(0, sent.ack || 0), erro: null } });
        if (message.chaveArquivo) removerAposEnvio(message.chaveArquivo);
      } catch (error) {
        console.warn('WhatsApp envio sem confirmação', { tipo: message.tipo, envioMs: Date.now() - inicioEnvio });
        const quoteUnavailable = error?.code === 'QUOTE_UNAVAILABLE' || String(error?.message).includes('Could not get the quoted message.');
        await prisma.mensagemWhatsApp.update({ where: { id: message.id }, data: {
          status: quoteUnavailable ? 'FALHOU' : 'INCERTO',
          erro: quoteUnavailable ? 'A mensagem citada não está mais disponível no WhatsApp. Nenhuma resposta foi enviada. Selecione outra mensagem.' : 'Envio sem confirmação. Confira o histórico antes de enviar novamente para evitar duplicidade.',
        } });
      } finally {
        prazo.abort();
        concluido = true;
        enviosEmTransmissao.delete(transmissao);
        liberarEco();
        if (expirou) recuperar('prazo de envio excedido');
      }
      if (expirou) return false;
    }
    return pending.length > 0;
  }

  async function aguardarEnvio(message) {
    const externaId = message.id?._serialized;
    if (!(message.fromMe || message.id?.fromMe) || !externaId || !enviosEmTransmissao.size) return;
    // Outgoing echoes can identify the same contact by LID instead of the JID used to send.
    const ativos = [...enviosEmTransmissao];
    while (ativos.some(transmissao => !transmissao.concluido)) {
      const restante = ativos.filter(transmissao => !transmissao.concluido);
      const existente = await prisma.mensagemWhatsApp.findUnique({
        where: { conta_externaId: { conta, externaId } }, select: { id: true },
      });
      if (existente) return;
      await Promise.race(restante.map(transmissao => transmissao.envio));
    }
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
  const onMessage = message => {
    void aguardarEnvio(message).catch(log).then(() => agendarRecebimento(message, message.hasMedia ? 2 : 1));
  };
  const onAck = (message, ack) => { void aguardarEnvio(message).then(() => enqueue(() => confirmar(message, ack))).catch(log); };
  client.on('message_create', onMessage);
  client.on('message_ack', onAck);

  function acordarEnvios(account) {
    if (stopped || (account && account !== conta)) return;
    for (const faixa of envios) if (faixa.job) faixa.avisado = true;
    void processarEnvios();
  }

  function processarEnvios() {
    return Promise.all(envios.map(faixa => {
      if (faixa.job) return faixa.job;
      if (stopped || !ativo()) return;
      faixa.avisado = false;
      faixa.job = enviarPendentes(faixa.midia).then(avancar => {
        faixa.job = null;
        if (avancar || faixa.avisado) void processarEnvios();
      }, error => { faixa.job = null; log(error); });
      return faixa.job;
    }));
  }

  async function drain() {
    while (envios.some(faixa => faixa.job)) await Promise.all(envios.map(faixa => faixa.job));
    await fila.drain();
  }

  let envioTimer;

  function verificarFila() {
    // Recover missed notifications without waiting for the history sync.
    void processarEnvios();
  }

  async function tick() {
    try {
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
    receber, confirmar, identificar, acordarEnvios, apagarParaTodos, enviarPendentes: async () => { await processarEnvios(); await drain(); },
    drain,
    sincronizar,
    async start() {
      await prisma.mensagemWhatsApp.updateMany({ where: { conta, status: 'ENVIANDO' }, data: { status: 'INCERTO', erro: 'A conexão reiniciou durante o envio. Confira o histórico antes de reenviar.' } });
      if (stopped) return;
      verificarFila();
      envioTimer ??= setInterval(verificarFila, 2000);
      void tick();
      // Map registered numbers before importing history, preserving their owners.
      const customers = await prisma.cliente.findMany({ select: { id: true }, orderBy: { ultimaMensagemEm: { sort: 'desc', nulls: 'last' } }, take: 100 });
      for (const customer of customers) {
        if (stopped) break;
        await sincronizar(customer.id).catch(log);
      }
    },
    async stop() { stopped = true; clearTimeout(timer); clearInterval(envioTimer); for (const entry of recebimentos.values()) clearTimeout(entry.timer); recebimentos.clear(); client.off('message_create', onMessage); client.off('message_ack', onAck); await Promise.allSettled([...synchronizing.values()]); await drain(); },
  };
}
