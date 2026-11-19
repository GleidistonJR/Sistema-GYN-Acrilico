"use server";
import { exigirUsuario } from "@/lib/autorizacao";
import { PERFIS_RELATORIO_PONTO } from '@/lib/permissoes';

import { prisma } from "@/lib/prisma";

interface Pontos {
  id: number;
  cpf: string;
  dataHora: string;
  tipo: string;
  colaborador: { nome: string };
}

export async function buscarPontos(dataString: string) {
  await exigirUsuario(PERFIS_RELATORIO_PONTO);
  // Monta o início e fim do dia baseado no fuso horário para abranger o dia todo
  const inicioDia = new Date(`${dataString}T00:00:00-03:00`);
  const fimDia = new Date(`${dataString}T23:59:59-03:00`);

  const pontos = await prisma.ponto.findMany({
    where: {
      dataHora: {
        gte: inicioDia,
        lte: fimDia
      }
    },
    include: {
      colaborador: {
        select: { nome: true }
      }
    },
    orderBy: {
      dataHora: 'desc' // Alterado para 'asc' para mostrar na ordem em que o dia aconteceu
    },
  });

  return pontos;
}
