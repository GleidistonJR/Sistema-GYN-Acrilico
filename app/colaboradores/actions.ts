"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache"; // Importante para atualizar a tela

// FUNÇÃO 1: CRIAR
export async function salvarColaborador(dados: { nome: string, cargo: string, cpf: string, salario: number }) {
  try {
    const novoColaborador = await prisma.colaborador.create({
      data: {
        nome: dados.nome,
        cargo: dados.cargo,
        cpf: dados.cpf,
        salario: dados.salario,
      },
    });

    revalidatePath("/colaboradores");
    return { sucesso: true, colaborador: novoColaborador };
  } catch (error) {
    console.error("Erro ao salvar colaborador:", error);
    return { sucesso: false, erro: "Não foi possível salvar o colaborador." };
  }
}

// FUNÇÃO 2: BUSCAR
export async function buscarColaboradores(filtroCpf?: string) {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      where: filtroCpf ? { cpf: { contains: filtroCpf } } : {},
      orderBy: {
        nome: 'asc', // Organiza por ordem alfabética
      },
    });

    revalidatePath("/colaboradores");
    return colaboradores;
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return [];
  }
}

// FUNÇÃO 3: DELETAR
export async function deletarColaborador(id: number) {
  try {
    await prisma.colaborador.delete({
      where: {
        id: id,
      },
    });

    // Isso avisa ao Next.js para limpar o cache e mostrar a lista atualizada
    revalidatePath("/colaboradores");

    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return { sucesso: false, erro: "Não foi possível excluir o colaborador." };
  }
}