"use server";
import { prisma } from "@/lib/prisma";

export async function criarMaterial(dados: any) {
    return await prisma.material.create({
        data: {
            nome: dados.nome,
            espessura: dados.espessura,
            cor: dados.cor,
            custo: dados.custo,
            estoque: dados.estoque,
            categoriaId: dados.categoria,
        },
        include: { categoria: true },
    });
}

export async function criarCategoria(nome: string) {

    await prisma.materialCatogoria.create({
        data: {
            nome: nome,
        },
    });
}

export async function getCategorias() {
    return await prisma.materialCatogoria.findMany();
}

export async function getMateriais() {
    return await prisma.material.findMany({
        include: { categoria: true },
    });
}

export async function deleteMaterial(id: string) {
    return await prisma.material.delete({
        where: { id: id },
    });
}

export async function atualizarMaterial(id: string, dados: any) {
    return await prisma.material.update({
        where: { id: id },
        data: {
            nome: dados.nome,
            espessura: dados.espessura,
            cor: dados.cor,
            custo: dados.custo,
            estoque: dados.estoque,
            categoriaId: dados.categoria,
        },
        include: { categoria: true },
    });
}