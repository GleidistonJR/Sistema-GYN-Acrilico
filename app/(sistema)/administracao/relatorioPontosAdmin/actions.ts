"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache"; // Importante para atualizar a tela

interface Pontos {
  id: number;
  cpf: string;
  dataHora: Date | string;
  tipo: string;
  colaborador: { nome: string };
}

// FUNÇÃO 2: BUSCAR
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

// FUNÇÃO 2: BUSCAR
export async function buscarPontoPorId(id: number) {
  return await prisma.ponto.findUnique({
    where: { id },
    include: {
      colaborador: {
        select: {
          nome: true
        }
      }
    },
  });
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

// FUNÇÃO 4: EDITAR

export async function atualizarPonto(dados: Pontos, motivo: string) {
  try {
    if (dados.id) {
      // Se tem ID, é um UPDATE (prisma.colaborador.update...)
      const pontoAtualizado = await prisma.ponto.update({
        where: {
          id: dados.id, // Critério de busca (obrigatório ser um campo @unique)
        },
        data: {
          cpf: dados.cpf,
          dataHora: dados.dataHora,
          tipo: dados.tipo
        },
      });

      revalidatePath("/relatorioPontosAdmin");
      return { sucesso: true, colaborador: pontoAtualizado };
    }
  } catch (error) {
    console.error("Erro ao salvar colaborador:", error);
    return { sucesso: false, erro: "Não foi possível salvar o colaborador." };
  }
}