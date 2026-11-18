// A small snapshot keeps replies readable without duplicating media or loading old pages.
export function resumoCitacao(message) {
  return {
    externaId: message?.id?._serialized || null,
    texto: String(message?.body || '').slice(0, 1000),
    tipo: String(message?.type || 'indisponivel').slice(0, 40),
    direcao: message ? message.fromMe ? 'SAIDA' : 'ENTRADA' : null,
  };
}

export async function obterCitacao(message) {
  if (!message.hasQuotedMsg) return null;
  try { return resumoCitacao(await message.getQuotedMessage()); }
  catch { return resumoCitacao(null); }
}
