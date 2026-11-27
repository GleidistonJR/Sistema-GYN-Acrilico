export type Operador = { id: string; role: string };

function completarCelular(nacional: string) {
  return /^[1-9]\d[6-9]\d{7}$/.test(nacional)
    ? nacional.slice(0, 2) + '9' + nacional.slice(2)
    : nacional;
}

function formatarDigitosNacionais(digitos: string) {
  if (!digitos) return '';
  if (digitos.length <= 2) return '(' + digitos;
  const numero = digitos.slice(2);
  const corte = numero.length > 8 ? 5 : 4;
  return `(${digitos.slice(0, 2)}) ${numero.slice(0, corte)}${numero.length > corte ? '-' + numero.slice(corte) : ''}`;
}

export function mascararTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, '');
  return formatarDigitosNacionais(digitos.replace(/^55(?=\d{10,11}$)/, '').slice(0, 11));
}

export function exibirTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, '');
  const nacional = digitos.replace(/^55(?=\d{10,11}$)/, '');
  if (valor.trim().startsWith('+') && nacional === digitos) return valor;
  return /^\d{10,11}$/.test(nacional) ? formatarDigitosNacionais(completarCelular(nacional)) : valor;
}

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
  return '+55' + completarCelular(nacional);
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
