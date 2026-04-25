"use server";

import { prisma } from "@/lib/prisma";

export async function buscarPontos(cpf?: string) {
  try {
    const pontos = await prisma.ponto.findMany({
      where: cpf ? { cpf: cpf } : {}, 
      include: {
        colaborador: {
          select: {
            nome: true // Queremos apenas o nome, para não vir dados desnecessários
          }
        }
      },
      orderBy: {
        dataHora: 'desc', // 'desc' para decrescente (mais novos primeiro)
      },
    });

    return pontos;

  } catch (error) {
    console.error("Erro ao buscar pontos:", error);
    return [];
  }
}