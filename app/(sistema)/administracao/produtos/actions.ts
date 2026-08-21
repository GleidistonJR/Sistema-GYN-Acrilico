"use server";
import { prisma } from "@/lib/prisma";

export async function criarMaterial(dados: any) {

    await prisma.material.create({
        data: {
            nome: dados.nome,
            espessura: dados.espessura,
            cor: dados.cor,
            custo: dados.custo,
            estoque: dados.estoque,
            categoriaId: dados.categoria,

        },
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