"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function salvarPontoNoBanco(cpf: string) {
  try {
    // 1. Usando findUnique em vez de findFirst (é mais rápido no Postgres)
    const colaborador = await prisma.colaborador.findUnique({
      where: { cpf: cpf },
    });

    if (!colaborador) {
      console.log("CPF não cadastrado");
      return { sucesso: false, mensagem: "CPF não cadastrado" };
    }

    // Busca o último ponto registrado
    const ultimoPonto = await prisma.ponto.findFirst({
      where: { cpf: cpf },
      orderBy: {
        // 2. MUDANÇA CRÍTICA: Ordenar por dataHora em vez de id
        dataHora: 'desc', 
      }
    });

    // --- LÓGICA INTELIGENTE DE DATA ---
    let proximoTipoPonto: 'Entrada' | 'Saida' = 'Entrada';
    
    // Capturamos o momento exato agora em uma variável
    const agora = new Date();

    if (ultimoPonto) {
      const hojeStr = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const ultimoPontoStr = new Date(ultimoPonto.dataHora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const ehHoje = hojeStr === ultimoPontoStr;

      if (ehHoje) {
        proximoTipoPonto = ultimoPonto.tipo === 'Saida' ? 'Entrada' : 'Saida';
      } else {
        proximoTipoPonto = 'Entrada';
      }
    }
    // ----------------------------------

    // Cria o ponto com o tipo correto
    await prisma.ponto.create({
      data: {
        cpf: cpf,
        tipo: proximoTipoPonto,
        // 3. Passando a data explicitamente para evitar conflitos de fuso no Neon
        dataHora: agora, 
      },
    });

    revalidatePath("/relatorios");
    return { sucesso: true };

  } catch (error) {
    console.error("Erro interno ao salvar ponto no Postgres:", error);
    return { sucesso: false, mensagem: "Erro ao salvar ponto. Tente novamente." };
  }
}