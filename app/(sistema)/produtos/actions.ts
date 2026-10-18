"use server";
import { prisma } from "@/lib/prisma";

export async function getProdutos() {
    return await prisma.produto.findMany({ orderBy: { nome: "asc" } });
}

export async function criarProduto(dados: any) {
    return await prisma.produto.create({
        data: {
            nome: dados.nome,
            descricao: dados.descricao || null,
            estoque: dados.estoque,
            precoCusto: dados.precoCusto,
            precoVenda: dados.precoVenda,
        },
    });
}

export async function atualizarProduto(id: string, dados: any) {
    return await prisma.produto.update({
        where: { id },
        data: {
            nome: dados.nome,
            descricao: dados.descricao || null,
            estoque: dados.estoque,
            precoCusto: dados.precoCusto,
            precoVenda: dados.precoVenda,
        },
    });
}

export async function deleteProduto(id: string) {
    return await prisma.produto.delete({ where: { id } });
}