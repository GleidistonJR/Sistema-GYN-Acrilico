import { exigirUsuario } from '@/lib/autorizacao';
import { PERFIS_AVULSOS } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';
import PainelAcessos from './PainelAcessos';

export default async function AcessosAvulsos() {
  await exigirUsuario(['ADMIN']);
  const contas = await prisma.user.findMany({
    where: { role: { in: [...PERFIS_AVULSOS] }, colaborador: { is: null } },
    orderBy: { email: 'asc' },
    select: { id: true, email: true, role: true },
  });
  return <PainelAcessos contas={contas} />;
}
