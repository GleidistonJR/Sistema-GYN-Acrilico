'use server';

import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { exigirUsuario } from '@/lib/autorizacao';
import { bloquearAlteracoesDeAcesso } from '@/lib/gestao-acessos';
import { ehPerfilAvulso, PERFIS_AVULSOS } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';

const caminho = '/administracao/acessos';

export async function criarAcessoAvulso(form: FormData) {
  const admin = await exigirUsuario(['ADMIN']);
  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');
  const role = String(form.get('role') ?? '');
  if (!ehPerfilAvulso(role)) return { sucesso: false, erro: 'Selecione um perfil de acesso avulso.' };
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+$/.test(email) || !senha || Buffer.byteLength(senha) > 72) {
    return { sucesso: false, erro: 'Informe um e-mail válido e uma senha de até 72 bytes.' };
  }
  try {
    const password = await bcrypt.hash(senha, 10);
    await prisma.$transaction(async tx => {
      await bloquearAlteracoesDeAcesso(tx, admin.id);
      await tx.user.create({ data: { email, password, role }, select: { id: true } });
    }, { timeout: 15000 });
    revalidatePath(caminho);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002'
      ? 'Já existe uma conta com esse e-mail.' : 'Não foi possível criar o acesso.' };
  }
}

export async function revogarAcessoAvulso(id: string) {
  const admin = await exigirUsuario(['ADMIN']);
  try {
    const resultado = await prisma.$transaction(async tx => {
      await bloquearAlteracoesDeAcesso(tx, admin.id);
      return tx.user.deleteMany({ where: { id, role: { in: [...PERFIS_AVULSOS] }, colaborador: { is: null } } });
    }, { timeout: 15000 });
    if (!resultado.count) return { sucesso: false, erro: 'Acesso avulso indisponível.' };
    revalidatePath(caminho);
    return { sucesso: true };
  } catch {
    return { sucesso: false, erro: 'Não foi possível revogar o acesso.' };
  }
}
