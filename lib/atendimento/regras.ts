export type Operador = { id: string; role: string };

export function podeEditarCliente(usuario: Operador, responsavelId: string | null) {
  return usuario.role === 'ADMIN' || (usuario.role === 'USER' && usuario.id === responsavelId);
}

export function normalizarTelefone(valor: unknown) {
  if (typeof valor !== 'string' || !/^\+?[\d\s().-]+$/.test(valor)) {
    throw new Error('Informe um telefone com código do país e DDD.');
  }
  const numeros = valor.replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(numeros)) throw new Error('Informe de 8 a 15 dígitos, incluindo país e DDD.');
  return '+' + numeros;
}

export function validarTexto(valor: unknown, limite: number) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > limite) {
    throw new Error(`Informe um texto de 1 a ${limite} caracteres.`);
  }
  return valor.trim();
}

export function filtroClientes(usuario: Operador, fila: string) {
  if (fila === 'fila') return { responsavelId: null };
  if (fila === 'todos' && ['ADMIN', 'USER'].includes(usuario.role)) return {};
  return { responsavelId: usuario.id };
}
