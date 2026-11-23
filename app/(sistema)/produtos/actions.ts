"use server";
import { permite, PERFIS_COMERCIAIS } from '@/lib/permissoes';
import { prisma } from "@/lib/prisma";
import { exigirUsuario } from '@/lib/autorizacao';
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
    return usuario && permite(PERFIS_COMERCIAIS, usuario.role) ? usuario.role : null;
}

export async function getProdutos() {
    await exigirUsuario(PERFIS_COMERCIAIS);
    return prisma.produto.findMany({ orderBy: { nome: "asc" }, include: { foto: selecaoFoto } });
}

export async function criarProduto(dados: DadosProduto) {
    const usuario = await exigirUsuario(PERFIS_COMERCIAIS);
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
    const usuario = await exigirUsuario(PERFIS_COMERCIAIS);
    const admin = usuario.role === 'ADMIN';
    const foto = await prepararFoto(dados.foto);
    // Explicit field lists prevent protected values from being overwritten by USER requests.
    return prisma.$transaction(async tx => {
        if (foto === null) await tx.fotoItem.deleteMany({ where: { produtoId: id } });
        return tx.produto.update({
            where: { id },
            data: {
                descricao: validarDescricao(dados.descricao),
                estoque: dados.estoque === undefined ? undefined : validarQuantidade(dados.estoque),
                foto: foto ? { upsert: { create: foto, update: foto } } : undefined,
                ...(admin ? {
                    nome: dados.nome === undefined ? undefined : validarNome(dados.nome),
                    estoquePadrao: dados.estoquePadrao === undefined ? undefined : validarQuantidade(dados.estoquePadrao),
                    precoCusto: dados.precoCusto === undefined ? undefined : validarPreco(dados.precoCusto),
                    precoVenda: dados.precoVenda === undefined ? undefined : validarPreco(dados.precoVenda),
                } : {}),
            },
            include: { foto: selecaoFoto },
        });
    });
}

export async function deleteProduto(id: string) {
    const usuario = await exigirUsuario(PERFIS_COMERCIAIS);
    if (usuario.role !== 'ADMIN') throw new Error('Apenas administradores podem excluir produtos.');
    return prisma.produto.delete({ where: { id } });
}

export async function atualizarEstoqueProduto(id: string, estoque: number, estoquePadrao?: number) {
    const usuario = await exigirUsuario(PERFIS_COMERCIAIS);
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
