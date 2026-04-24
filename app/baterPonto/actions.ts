"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function salvarPontoNoBanco(cpf: string, tipo: string) {
  try {
    await prisma.ponto.create({
      data: {
        cpf: cpf,
        tipo: tipo,
      },
    });
    revalidatePath("/relatorios");
    return { sucesso: true };
  } catch (error) {
    console.error(error);
    return { sucesso: false };
  }
}