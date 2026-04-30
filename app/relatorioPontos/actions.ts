"use server";

import { prisma } from "@/lib/prisma";

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