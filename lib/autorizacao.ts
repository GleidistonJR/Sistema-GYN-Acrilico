import 'server-only';
import { obterUsuarioSessao } from './sessao';

export async function exigirUsuario(roles: readonly string[] = ['ADMIN', 'USER']) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !roles.includes(usuario.role)) throw new Error('Acesso não autorizado.');
  return usuario;
}

export async function exigirPerfil(colaboradorId: number) {
  const usuario = await exigirUsuario();
  if (usuario.role !== 'ADMIN' && usuario.colaborador?.id !== colaboradorId) {
    throw new Error('Acesso não autorizado.');
  }
  return usuario;
}
