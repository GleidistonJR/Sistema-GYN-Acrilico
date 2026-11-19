import 'server-only';
import type { Prisma } from '@prisma/client';

export async function bloquearAlteracoesDeAcesso(tx: Prisma.TransactionClient, adminId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261119, 5)::text AS bloqueio`;
  const admin = await tx.user.findFirst({
    where: { id: adminId, role: 'ADMIN', colaborador: { is: { inativadoEm: null } } },
    select: { id: true },
  });
  if (!admin) throw new Error('Acesso não autorizado.');
}
