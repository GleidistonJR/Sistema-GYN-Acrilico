// Executed inside the WhatsApp browser, not Node. Restore essential listeners even
// when the library's optional event setup finishes incompletely during login.
export function instalarPonteMensagens() {
  const { Msg } = window.require('WAWebCollections');
  if (!Msg || !window.WWebJS || typeof window.onAddMessageEvent !== 'function' || typeof window.onMessageAckEvent !== 'function') {
    throw new Error('Eventos essenciais do WhatsApp ainda não estão disponíveis.');
  }
  const previous = window.__gynPonteMensagens;
  if (previous?.collection === Msg) {
    // Reattach our own handlers if WhatsApp reset its listener registry in place.
    for (const [event, callback] of previous.listeners) { Msg.off(event, callback); Msg.on(event, callback); }
    const since = Date.now() / 1000 - 300;
    for (const message of Msg.getModelsArray().filter(m => m.isNewMsg && m.t >= since).slice(-100)) previous.listeners[0][1](message);
    return { instalada: true, nova: false };
  }
  if (previous) for (const [event, callback] of previous.listeners) previous.collection.off(event, callback);
  const seen = new Set();
  const state = { collection: Msg, listeners: [], recebidas: 0, falhas: 0, ultimaEntrada: null };
  function receive(message) {
    if (!message?.isNewMsg || ['ciphertext', 'revoked', 'gp2'].includes(message.type)) return;
    let data;
    try { data = window.WWebJS.getMessageModel(message); } catch { state.falhas++; return; }
    const id = data.id?._serialized;
    if (!id || seen.has(id)) return;
    if (seen.size >= 1000) seen.delete(seen.values().next().value);
    seen.add(id); state.recebidas++; state.ultimaEntrada = Date.now();
    Promise.resolve(window.onAddMessageEvent(data)).catch(() => { seen.delete(id); state.falhas++; });
  }
  function ack(message, value) {
    try { Promise.resolve(window.onMessageAckEvent(window.WWebJS.getMessageModel(message), value)).catch(() => { state.falhas++; }); }
    catch { state.falhas++; }
  }
  state.listeners = [['add', receive], ['change:type', receive], ['change:isNewMsg', receive], ['change:ack', ack]];
  for (const [event, callback] of state.listeners) Msg.on(event, callback);
  window.__gynPonteMensagens = state;
  // Replay only recent loaded events when repairing a lost listener; no history/network query.
  const since = Date.now() / 1000 - 300;
  for (const message of Msg.getModelsArray().filter(m => m.isNewMsg && m.t >= since).slice(-100)) receive(message);
  return { instalada: true, nova: true };
}
