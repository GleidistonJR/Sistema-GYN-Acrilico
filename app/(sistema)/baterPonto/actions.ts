"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
// Certifique-se de importar o seu cliente do prisma configurado
// import { prisma } from "@/lib/prisma"; 

export async function salvarPontoNoBanco(cpf: string) {
  try {

    const colaborador = await prisma.colaborador.findFirst({
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
        id: 'desc',
      }
    });

    // --- LÓGICA INTELIGENTE DE DATA ---
    let proximoTipoPonto: 'Entrada' | 'Saida' = 'Entrada';

    if (ultimoPonto) {
      // Pega a data de hoje e a data do último ponto no formato DD/MM/AAAA
      // Usando o fuso do Brasil para garantir que a virada do dia aconteça no horário certo
      const hojeStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      
      // ATENÇÃO AQUI: Mudado de 'createdAt' para 'dataHora' que é o campo do seu Schema
      const ultimoPontoStr = new Date(ultimoPonto.dataHora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const ehHoje = hojeStr === ultimoPontoStr;

      if (ehHoje) {
        // Se for no mesmo dia, segue a lógica normal de alternar
        proximoTipoPonto = ultimoPonto.tipo === 'Saida' ? 'Entrada' : 'Saida';
      } else {
        // Se o último ponto foi em outro dia, força 'Entrada'
        // Deixando o ponto esquecido do dia anterior em aberto para o supervisor resolver
        proximoTipoPonto = 'Entrada';
      }
    } else {
      // Se não houver nenhum ponto anterior no sistema, por padrão é Entrada
      proximoTipoPonto = 'Entrada';
    }
    // ----------------------------------

    // Cria o ponto com o tipo correto
    await prisma.ponto.create({
      data: {
        cpf: cpf,
        tipo: proximoTipoPonto,
        // O campo dataHora será preenchido automaticamente com @default(now()) do seu SQLite
      },
    });

    revalidatePath("/relatorios");
    return { sucesso: true };

  } catch (error) {
    console.error(error);
    return { sucesso: false, mensagem: "Erro interno ao salvar ponto" };
  }
}