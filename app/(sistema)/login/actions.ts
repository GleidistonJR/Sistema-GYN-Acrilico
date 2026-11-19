"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { criarSessao, removerSessao } from '@/lib/sessao';

export async function verificarLogin(email: string, senha: string) {
  try {
    const usuario = await prisma.user.findUnique({
      where: { email, colaborador: { is: { inativadoEm: null } } },
      select: { id: true, password: true, role: true, colaborador: { select: { id: true, nome: true } } },
    });

    if (!usuario) {
      return { sucesso: false, erro: "Usuário ou senha incorretos!" };
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.password);

    if (!senhaConfere) {
      return { sucesso: false, erro: "Usuário ou senha incorretos!" };
    }

    await criarSessao(usuario.id);
    return {
      sucesso: true,
      role: usuario.role,
      userId: usuario.colaborador?.id,
      userNome: usuario.colaborador?.nome,

    };
  } catch (error) {
    console.error("Erro no login:", error);
    return { sucesso: false, erro: "Erro ao tentar fazer login." };
  }
}

export async function encerrarSessao() {
  await removerSessao();
}
