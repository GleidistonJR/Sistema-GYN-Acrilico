export function validarApelido(value) {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new Error('Informe um apelido de até 40 caracteres, sem quebras de linha.');
  const nome = value.trim().replace(/ +/g, ' ');
  if (!nome || nome.length > 40 || !/^[\p{L}\p{M}\p{N} .'-]+$/u.test(nome)) throw new Error('Use até 40 caracteres: letras, números, espaços, ponto, apóstrofo ou hífen.');
  return nome;
}

export function apelidoEfetivo(usuario) {
  if (usuario.apelido) return usuario.apelido;
  if (usuario.role === 'RECEPCAO') return 'Recepção';
  try { return validarApelido(usuario.colaborador?.nome?.trim().split(/\s+/)[0]); }
  catch { return 'Atendimento'; }
}

export function assinarMensagem(texto, apelido, mimeType) {
  // Audio captions are not displayed consistently by WhatsApp. Do not create extra sends.
  if (mimeType?.startsWith('audio/')) return texto;
  return `*${validarApelido(apelido)}:*${texto ? '\n' + texto : ''}`;
}
