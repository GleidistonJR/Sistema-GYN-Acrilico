"use server";
import { exigirUsuario } from "@/lib/autorizacao";
import { PERFIS_REGISTRO_PONTO } from '@/lib/permissoes';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function salvarPontoNoBanco(cpf: string) {
  await exigirUsuario(PERFIS_REGISTRO_PONTO);
  try {
    // 1. Usando findUnique em vez de findFirst (é mais rápido no Postgres)
    const colaborador = await prisma.colaborador.findUnique({
      where: { cpf, inativadoEm: null },
      select: { id: true },
    });

    if (!colaborador) {
      return { sucesso: false, mensagem: "CPF não cadastrado ou colaborador inativo." };
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
    const registrados = await prisma.$executeRaw`
      INSERT INTO "Ponto" ("cpf", "tipo", "dataHora")
      SELECT c.cpf, ${proximoTipoPonto}, ${agora} FROM "Colaborador" c
      WHERE c.id = ${colaborador.id} AND c.cpf = ${cpf} AND c."inativadoEm" IS NULL
      FOR SHARE
    `;
    if (!registrados) return { sucesso: false, mensagem: "CPF não cadastrado ou colaborador inativo." };

    revalidatePath("/relatorios");
    return { sucesso: true };

  } catch (error: any) {
    // Exibe no console da Vercel / terminal local o objeto completo
    console.error("=== ERRO DETALHADO AO SALVAR PONTO ===");
    console.error(error);

    // Retorna a mensagem real para você ver na tela durante os testes
    return {
      sucesso: false,
      mensagem: error?.message || "Erro desconhecido ao salvar"
    };
  }
}
