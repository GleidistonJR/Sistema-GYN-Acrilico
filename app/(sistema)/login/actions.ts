"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { criarSessao, removerSessao } from '@/lib/sessao';
import { ehPerfilAvulso, permite, PERFIS_REGISTRO_PONTO } from '@/lib/permissoes';

export async function verificarLogin(email: string, senha: string) {
  try {
    const usuario = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true, role: true, colaborador: { select: { id: true, inativadoEm: true } } },
    });

    if (!usuario || (ehPerfilAvulso(usuario.role) ? usuario.colaborador : !usuario.colaborador || usuario.colaborador.inativadoEm)) {
      return { sucesso: false, erro: "Usuário ou senha incorretos!" };
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.password);

    if (!senhaConfere) {
      return { sucesso: false, erro: "Usuário ou senha incorretos!" };
    }

    await criarSessao(usuario.id);
    return {
      sucesso: true,
      destino: permite(PERFIS_REGISTRO_PONTO, usuario.role) ? '/baterPonto'
        : usuario.role === 'RECEPCAO' ? '/atendimento'
          : usuario.role === 'COMERCIAL' ? '/orcamentos' : '/administracao/colaboradores/' + usuario.colaborador?.id,
    };
  } catch (error) {
    console.error("Erro no login:", error);
    return { sucesso: false, erro: "Erro ao tentar fazer login." };
  }
}

export async function encerrarSessao() {
  await removerSessao();
}
