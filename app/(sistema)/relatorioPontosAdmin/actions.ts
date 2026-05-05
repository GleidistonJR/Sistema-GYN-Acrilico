"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache"; // Importante para atualizar a tela

interface Pontos {
  id: number;
  cpf: string;
  dataHora: string;
  tipo: string;
  colaborador: { nome: string };
}

export async function buscarPontos(filtro?: string): Promise<Pontos[]> {
  try {
    const pontos = await prisma.ponto.findMany({
      where: filtro ? {
        OR: [
          {
            cpf: {
              contains: filtro // Busca parcial no CPF
            }
          },
          {
            colaborador: {
              nome: {
                contains: filtro
              }
            }
          }
        ]
      } : {},
      include: {
        colaborador: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        dataHora: 'desc',
      },
    });

    return pontos as unknown as Pontos[];

  } catch (error) {
    console.error("Erro ao buscar pontos:", error);
    return [];
  }
}

// FUNÇÃO 3: DELETAR
export async function deletarPonto(id: number) {
  try {

    await prisma.ponto.delete({
      where: {
        id: id,
      },
    });

    // Isso avisa ao Next.js para limpar o cache e mostrar a lista atualizada
    revalidatePath("/relatorioPontosAdmin");

    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return { sucesso: false, erro: "Não foi possível excluir o colaborador." };
  }
}