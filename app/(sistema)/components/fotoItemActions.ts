'use server';

import { exigirUsuario } from '@/lib/autorizacao';
import { prepararFoto, selecaoFoto } from '@/lib/fotos';
import { PERFIS_COMERCIAIS } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';

export async function salvarFotoItem(tipo: 'material' | 'produto', id: string, valor: string | null) {
  await exigirUsuario(PERFIS_COMERCIAIS);
  if ((tipo !== 'material' && tipo !== 'produto') || typeof id !== 'string' || !id.trim()) {
    throw new Error('Item inválido.');
  }
  const vinculo = tipo === 'material' ? { materialId: id } : { produtoId: id };
  if (valor === null) {
    await prisma.fotoItem.deleteMany({ where: vinculo });
    return null;
  }
  const foto = await prepararFoto(valor);
  if (!foto) throw new Error('Selecione uma foto.');
  return prisma.fotoItem.upsert({
    where: vinculo, create: { ...foto, ...vinculo }, update: foto, ...selecaoFoto,
  });
}
