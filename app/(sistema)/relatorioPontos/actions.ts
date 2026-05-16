"use server";

import { prisma } from "@/lib/prisma";

interface Pontos {
  id: number;
  cpf: string;
  dataHora: string;
  tipo: string;
  colaborador: { nome: string };
}

export async function buscarPontos(filtro?: string, pagina: number = 1): Promise<Pontos[]> {
  const itensPorPagina = 20;
  const skip = (pagina - 1) * itensPorPagina;

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
      take: itensPorPagina, // Limita em 20 resultados
      skip: skip,           // Pula os resultados das páginas anteriores
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