"use server";
import { prisma } from "@/lib/prisma";
import { obterUsuarioSessao } from '@/lib/sessao';
import { prepararFoto, selecaoFoto } from '@/lib/fotos';

interface DadosProduto {
    nome?: string;
    descricao?: string | null;
    estoque?: number;
    estoquePadrao?: number;
    precoCusto?: number;
    precoVenda?: number;
    foto?: string | null;
}

async function exigirUsuario() {
    const usuario = await obterUsuarioSessao();
    if (!usuario || !['ADMIN', 'USER'].includes(usuario.role)) {
        throw new Error('Faça login novamente para acessar os produtos.');
    }
    return usuario;
}

function validarQuantidade(valor: unknown) {
    if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 0 || valor > 2147483647) {
        throw new Error('Informe uma quantidade inteira maior ou igual a zero.');
    }
    return valor;
}

function validarPreco(valor: unknown) {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) throw new Error('Informe um preço válido.');
    return valor;
}

function validarNome(valor: unknown) {
    if (typeof valor !== 'string' || !valor.trim()) throw new Error('Informe o nome do produto.');
    return valor.trim();
}

function validarDescricao(valor: unknown) {
    if (valor === undefined) return undefined;
    if (valor !== null && typeof valor !== 'string') throw new Error('Descrição inválida.');
    return valor || null;
}

export async function getPermissoesProdutos() {
    const usuario = await obterUsuarioSessao();
    return usuario && ['ADMIN', 'USER'].includes(usuario.role) ? usuario.role : null;
}

export async function getProdutos() {
    await exigirUsuario();
    return prisma.produto.findMany({ orderBy: { nome: "asc" }, include: { foto: selecaoFoto } });
}

export async function criarProduto(dados: DadosProduto) {
    const usuario = await exigirUsuario();
    const admin = usuario.role === 'ADMIN';
    const foto = await prepararFoto(dados.foto);
    return prisma.produto.create({
        data: {
            nome: validarNome(dados.nome),
            descricao: validarDescricao(dados.descricao),
            estoque: validarQuantidade(dados.estoque ?? 0),
            estoquePadrao: admin ? validarQuantidade(dados.estoquePadrao ?? 0) : 0,
            precoCusto: admin ? validarPreco(dados.precoCusto ?? 0) : 0,
            precoVenda: admin ? validarPreco(dados.precoVenda ?? 0) : 0,
            foto: foto ? { create: foto } : undefined,
        },
        include: { foto: selecaoFoto },
    });
}

export async function atualizarProduto(id: string, dados: DadosProduto) {
    const usuario = await exigirUsuario();
    const admin = usuario.role === 'ADMIN';
    const foto = admin ? await prepararFoto(dados.foto) : undefined;
    // Explicit field lists prevent protected values from being overwritten by USER requests.
    return prisma.$transaction(async tx => {
        if (foto === null) await tx.fotoItem.deleteMany({ where: { produtoId: id } });
        return tx.produto.update({
            where: { id },
            data: {
                descricao: validarDescricao(dados.descricao),
                estoque: dados.estoque === undefined ? undefined : validarQuantidade(dados.estoque),
                ...(admin ? {
                    nome: dados.nome === undefined ? undefined : validarNome(dados.nome),
                    estoquePadrao: dados.estoquePadrao === undefined ? undefined : validarQuantidade(dados.estoquePadrao),
                    precoCusto: dados.precoCusto === undefined ? undefined : validarPreco(dados.precoCusto),
                    precoVenda: dados.precoVenda === undefined ? undefined : validarPreco(dados.precoVenda),
                    foto: foto ? { upsert: { create: foto, update: foto } } : undefined,
                } : {}),
            },
            include: { foto: selecaoFoto },
        });
    });
}

export async function deleteProduto(id: string) {
    const usuario = await exigirUsuario();
    if (usuario.role !== 'ADMIN') throw new Error('Apenas administradores podem excluir produtos.');
    return prisma.produto.delete({ where: { id } });
}

export async function atualizarEstoqueProduto(id: string, estoque: number, estoquePadrao?: number) {
    const usuario = await exigirUsuario();
    return prisma.produto.update({
        where: { id },
        data: {
            estoque: validarQuantidade(estoque),
            ...(usuario.role === 'ADMIN' && estoquePadrao !== undefined
                ? { estoquePadrao: validarQuantidade(estoquePadrao) } : {}),
        },
        include: { foto: selecaoFoto },
    });
}
