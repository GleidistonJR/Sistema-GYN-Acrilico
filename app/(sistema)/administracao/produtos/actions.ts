"use server";
import { prisma } from "@/lib/prisma";

export async function criarInsumo(dados) {

    // Se não tem ID, é um CREATE (prisma.colaborador.create...)
    await prisma.insumo.create({
        data: {
            nome: dados.nome,
            unidadeMedida: dados.unidadeMedida,
            precoCusto: dados.precoCusto,
            larguraChapaCm: dados.larguraChapaCm,
            alturaChapaCm: dados.alturaChapaCm,
        },
    });
}

