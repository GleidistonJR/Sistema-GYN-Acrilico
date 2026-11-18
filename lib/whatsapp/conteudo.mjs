export const LIMITE_MIDIA = 90 * 1024 * 1024;

export function telefoneDoJid(jid) {
  return typeof jid === 'string' && /^[1-9]\d{7,14}@c\.us$/.test(jid) ? '+' + jid.split('@')[0] : null;
}

export function variantesTelefone(telefone) {
  const values = [telefone];
  // Brazilian mobile numbers may be reported by WhatsApp without the ninth digit.
  if (/^\+55\d{2}9[6-9]\d{7}$/.test(telefone)) values.push(telefone.slice(0, 5) + telefone.slice(6));
  if (/^\+55\d{2}[6-9]\d{7}$/.test(telefone)) values.push(telefone.slice(0, 5) + '9' + telefone.slice(5));
  return values;
}

export function nomeArquivo(nome) {
  return String(nome || 'arquivo').replace(/[\x00-\x1f\x7f/\\"<>:|?*]/g, '_').slice(0, 120);
}

export function validarMidia(dados, mime) {
  const tipo = String(mime).split(';')[0].trim().toLowerCase();
  if (!dados.length || dados.length > LIMITE_MIDIA) throw new Error('O arquivo deve ter até 90 MB.');
  const inicio = dados.subarray(0, 16);
  const ascii = inicio.toString('latin1');
  const valido = {
    'application/pdf': ascii.startsWith('%PDF-'),
    'image/jpeg': inicio[0] === 255 && inicio[1] === 216 && inicio[2] === 255,
    'image/png': inicio.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'image/webp': ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP',
    'image/gif': ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a'),
    'audio/ogg': ascii.startsWith('OggS'),
    'audio/mpeg': ascii.startsWith('ID3') || (inicio[0] === 255 && (inicio[1] & 224) === 224),
    'video/mp4': ascii.slice(4, 8) === 'ftyp',
    'video/quicktime': ascii.slice(4, 8) === 'ftyp',
    'video/webm': inicio.subarray(0, 4).equals(Buffer.from([26,69,223,163])),
    'audio/mp4': ascii.slice(4, 8) === 'ftyp',
    'audio/wav': ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE',
    'audio/webm': inicio.subarray(0, 4).equals(Buffer.from([26,69,223,163])),
  }[tipo];
  if (!valido) throw new Error('Formato não aceito. Envie uma imagem, vídeo, áudio ou PDF válido.');
  return tipo;
}

export function statusAck(ack) {
  if (ack >= 3) return 'LIDA';
  if (ack >= 2) return 'ENTREGUE';
  if (ack >= 1) return 'ENVIADA';
  return ack < 0 ? 'FALHOU' : 'ENVIADA';
}
