"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from '@/lib/autorizacao';
import { obterUsuarioSessao } from '@/lib/sessao';
import { prepararFoto, selecaoFoto } from '@/lib/fotos';



async function exigirAdministrador() {
    const usuario = await exigirUsuario();
    if (usuario.role !== 'ADMIN') throw new Error('Apenas administradores podem alterar materiais e categorias.');
    return usuario;
}

export async function getPermissoesMateriais() {
    const usuario = await obterUsuarioSessao();
    return usuario && ['ADMIN', 'USER'].includes(usuario.role) ? usuario.role : null;
}

function validarEstoquePadrao(valor: unknown) {
    if (valor === undefined) return undefined;
    if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 0 || valor > 2147483647) {
        throw new Error('O estoque padrão deve ser um número inteiro maior ou igual a zero.');
    }
    return valor;
}

export async function criarMaterial(dados: any) {
    await exigirAdministrador();
    const foto = await prepararFoto(dados.foto);
    return await prisma.material.create({
        data: {
            nome: dados.nome,
            espessura: dados.espessura,
            cor: dados.cor,
            custo: dados.custo,
            valorVendaInteiro: dados.valorVendaInteiro,
            ValorVendaFracionado: dados.ValorVendaFracionado,
            estoque: dados.estoque,
            estoquePadrao: validarEstoquePadrao(dados.estoquePadrao) ?? 0,
            largura: dados.largura,
            altura: dados.altura,
            velocidadeCorte: dados.velocidadeCorte,
            categoriaId: dados.categoria,
            foto: foto ? { create: foto } : undefined,
        },
        include: { categoria: true, foto: selecaoFoto },
    });
}

export async function criarCategoria(nome: string) {
    return salvarCategoria(nome);
}

export async function atualizarCategoria(id: string, nome: string) {
    if (typeof id !== 'string' || !id.trim()) {
        return { sucesso: false as const, erro: 'Categoria inválida.' };
    }
    return salvarCategoria(nome, id);
}

async function salvarCategoria(nome: string, id?: string) {
    try {
        await exigirAdministrador();
        const nomeLimpo = typeof nome === 'string' ? nome.trim() : '';
        if (!nomeLimpo || nomeLimpo.length > 120) {
            return { sucesso: false as const, erro: 'Informe um nome com até 120 caracteres.' };
        }
        const existente = await prisma.materialCatogoria.findFirst({
            where: {
                nome: { equals: nomeLimpo, mode: 'insensitive' },
                ...(id ? { id: { not: id } } : {}),
            },
        });
        if (existente) {
            return { sucesso: false as const, erro: 'Já existe uma categoria com esse nome.' };
        }
        const categoria = id
            ? await prisma.materialCatogoria.update({ where: { id }, data: { nome: nomeLimpo } })
            : await prisma.materialCatogoria.create({ data: { nome: nomeLimpo } });
        revalidatePath('/materiais');
        revalidatePath('/orcamentos');
        return { sucesso: true as const, categoria };
    } catch (error) {
        console.error('Erro ao salvar categoria:', error);
        return { sucesso: false as const, erro: 'Não foi possível salvar a categoria. Tente novamente.' };
    }
}

export async function getCategorias() {
    await exigirUsuario();
    return await prisma.materialCatogoria.findMany({ orderBy: { nome: 'asc' } });
}

export async function getMateriais() {
    await exigirUsuario();
    return await prisma.material.findMany({
        include: { categoria: true, foto: selecaoFoto },
    });
}

export async function deleteMaterial(id: string) {
    await exigirAdministrador();
    return await prisma.material.delete({
        where: { id: id },
    });
}

export async function atualizarMaterial(id: string, dados: any) {
    await exigirAdministrador();
    const foto = await prepararFoto(dados.foto);
    return prisma.$transaction(async tx => {
        if (foto === null) await tx.fotoItem.deleteMany({ where: { materialId: id } });
        return tx.material.update({
            where: { id: id },
            data: {
                nome: dados.nome,
                espessura: dados.espessura,
                cor: dados.cor,
                custo: dados.custo,
                valorVendaInteiro: dados.valorVendaInteiro,
                ValorVendaFracionado: dados.ValorVendaFracionado,
                estoque: dados.estoque,
                estoquePadrao: validarEstoquePadrao(dados.estoquePadrao),
                largura: dados.largura,
                altura: dados.altura,
                velocidadeCorte: dados.velocidadeCorte,
                categoriaId: dados.categoria,
                foto: foto ? { upsert: { create: foto, update: foto } } : undefined,
            },
            include: { categoria: true, foto: selecaoFoto },
        });
    });
}

export async function atualizarEstoque(id: string, estoque: number, estoquePadrao?: number) {
    const usuario = await exigirUsuario();
    if (!Number.isFinite(estoque) || estoque < 0) throw new Error('Informe um estoque válido.');
    return await prisma.material.update({
        where: { id },
        data: {
            estoque,
            ...(usuario.role === 'ADMIN' && estoquePadrao !== undefined
                ? { estoquePadrao: validarEstoquePadrao(estoquePadrao) } : {}),
        },
        include: { categoria: true, foto: selecaoFoto },
    });
}
