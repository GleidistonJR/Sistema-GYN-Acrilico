export type Operador = { id: string; role: string };

export function normalizarTelefone(valor: unknown) {
  const mensagem = 'Informe o DDD e o número do WhatsApp (10 ou 11 dígitos).';
  const telefone = typeof valor === 'string' ? valor.trim() : '';
  if (!/^\+?[\d\s().-]+$/.test(telefone)) {
    throw new Error(mensagem);
  }
  const numeros = telefone.replace(/\D/g, '');
  const nacional = telefone.startsWith('+') || numeros.length > 11
    ? numeros.replace(/^55(?=\d{10,11}$)/, '')
    : numeros;
  if (!/^[1-9]\d\d{8,9}$/.test(nacional) || (telefone.startsWith('+') && nacional === numeros)) {
    throw new Error(mensagem);
  }
  return '+55' + nacional;
}

export function validarTexto(valor: unknown, limite: number) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > limite) {
    throw new Error(`Informe um texto de 1 a ${limite} caracteres.`);
  }
  return valor.trim();
}

export function filtroClientes(usuario: Operador, fila: string) {
  if (fila === 'fila') return { responsavelId: null };
  if (fila === 'todos' && ['ADMIN', 'USER', 'RECEPCAO'].includes(usuario.role)) return {};
  return { responsavelId: usuario.id };
}
