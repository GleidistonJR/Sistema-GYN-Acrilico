"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function salvarPontoNoBanco(cpf: string) {
  try {

    const colaboradores = await prisma.colaborador.findFirst({
      where: { cpf: cpf },
    });

    if (!colaboradores) {
      console.log("CPF não cadastrado");
      return { sucesso: false, mensagem: "CPF não cadastrado" };
    }

    const ultimoPonto = await prisma.ponto.findFirst({
      where: { cpf: cpf },
      orderBy: {
        id: 'desc',
      }
    });

    await prisma.ponto.create({
      data: {
        cpf: cpf,
        tipo: !ultimoPonto || ultimoPonto.tipo === 'Saida' ? 'Entrada' : 'Saida',
      },
    });

    revalidatePath("/relatorios");
    return { sucesso: true };

  } catch (error) {
    console.error(error);
    return { sucesso: false };
  }
}