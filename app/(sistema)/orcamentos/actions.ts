'use server';

import { permite, PERFIS_COMERCIAIS } from '@/lib/permissoes';
import { obterUsuarioSessao } from '@/lib/sessao';
import { prisma } from '@/lib/prisma';
import { apelidoEfetivo } from '@/lib/whatsapp/assinatura.mjs';

export async function buscarVendedorPdf() {
  const sessao = await obterUsuarioSessao();
  if (!sessao || !permite(PERFIS_COMERCIAIS, sessao.role)) throw new Error('Faça login novamente para gerar o PDF.');
  if (sessao.role === 'RECEPCAO') return apelidoEfetivo(sessao);
  const usuario = await prisma.user.findUnique({
    where: { id: sessao.id },
    select: { email: true, colaborador: { select: { nome: true } } },
  });
  return usuario?.colaborador?.nome ?? usuario?.email ?? '';
}
