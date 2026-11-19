'use server';

import { permite, PERFIS_COMERCIAIS } from '@/lib/permissoes';
import { obterUsuarioSessao } from '@/lib/sessao';
import { prisma } from '@/lib/prisma';

export async function buscarVendedorPdf() {
  const sessao = await obterUsuarioSessao();
  if (!sessao || !permite(PERFIS_COMERCIAIS, sessao.role)) throw new Error('Faça login novamente para gerar o PDF.');
  const usuario = await prisma.user.findUnique({
    where: { id: sessao.id },
    select: { email: true, colaborador: { select: { nome: true } } },
  });
  return usuario?.colaborador?.nome ?? usuario?.email ?? '';
}
