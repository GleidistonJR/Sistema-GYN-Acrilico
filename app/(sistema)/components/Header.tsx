import { obterUsuarioSessao } from '@/lib/sessao';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const usuario = await obterUsuarioSessao();
  return <HeaderClient usuario={usuario ? {
    role: usuario.role,
    userNome: usuario.colaborador?.nome ?? usuario.email,
    userId: usuario.colaborador?.id ?? null,
  } : null} />;
}
