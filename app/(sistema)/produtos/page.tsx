'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Plus, Copy, ClipboardCopy } from 'lucide-react';
import Link from 'next/link';
import ModalProduto from './modalProduto';
import { getProdutos, deleteProduto, getPermissoesProdutos } from './actions';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';
import { calcularReposicao, montarListaReposicaoProdutos } from '@/lib/reposicaoMateriais';
import ModalEstoque from './modalAtualizarEstoque';
import FotoItem from '../components/FotoItem';
import type { FotoResumo } from '@/lib/fotoItem';

export interface Produto {
    foto?: FotoResumo | null;
    id: string;
    nome: string;
    descricao: string | null;
    estoque: number;
    estoquePadrao: number;
    precoCusto: number;
    precoVenda: number;
}

export default function ProdutosFinais() {
    const { dados: role, carregando: carregandoPermissoes } = useDadosAtualizados(getPermissoesProdutos, null);
    const administrador = role === 'ADMIN';
    const { dados: produtos, setDados: setProdutos } = useDadosAtualizados<Produto[]>(getProdutos, [], { ativo: !!role });
    const [modalAberto, setModalAberto] = useState(false);
    const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
    const [pesquisa, setPesquisa] = useState('');

    const [produtoDuplicando, setProdutoDuplicando] = useState<Produto | null>(null);
    const [produtoEstoque, setProdutoEstoque] = useState<Produto | null>(null);
    const [copiandoLista, setCopiandoLista] = useState(false);
    const [mensagemLista, setMensagemLista] = useState('');

    async function copiarListaCompras() {
        if (copiandoLista) return;
        setCopiandoLista(true);
        setMensagemLista('');
        try {
            const atuais = await getProdutos();
            setProdutos(atuais);
            const lista = montarListaReposicaoProdutos(atuais);
            if (!lista) {
                setMensagemLista('Nenhum produto precisa de reposição. Confira se você já cadastrou os estoques padrão.');
                return;
            }
            await navigator.clipboard.writeText(lista);
            setMensagemLista('Lista de compras copiada! Inclui todos os produtos abaixo do estoque padrão.');
        } catch {
            setMensagemLista('Não foi possível copiar a lista. Verifique a conexão e a permissão da área de transferência.');
        } finally {
            setCopiandoLista(false);
        }
    }

    function handleSalvarProduto(salvo: Produto) {
        setProdutos(prev => {
            const existe = prev.some(p => p.id === salvo.id);
            return existe
                ? prev.map(p => (p.id === salvo.id ? salvo : p))
                : [...prev, salvo];
        });
    }

    async function handleDeletar(id: string) {
        if (!administrador) return;
        if (!window.confirm('Excluir este produto?')) return;
        await deleteProduto(id);
        setProdutos(prev => prev.filter(p => p.id !== id));
    }

    const normalizar = (texto: string) =>
        texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

    const termos = normalizar(pesquisa).split(/\s+/).filter(Boolean);

    const produtosFiltrados = produtos
        .filter((produto) => {
            const palavras = normalizar(`${produto.nome} ${produto.descricao ?? ''}`).split(/\s+/);
            return termos.every((termo) => palavras.some((p) => p.startsWith(termo)));
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));


    if (!role) return (
        <div className="mx-auto max-w-lg p-6 text-gray-700">
            {carregandoPermissoes ? <p role="status">Carregando produtos...</p> : <>
                <p>Entre novamente para acessar os produtos com suas permissões atualizadas.</p>
                <Link href="/login" className="mt-4 inline-block rounded-lg bg-[#0A2540] px-4 py-3 text-white">Fazer login</Link>
            </>}
        </div>
    );

    return (
        <div>
            <div className="w-full lg:w-6/7 px-3 sm:px-6 lg:px-0 m-auto pb-6">

                <div className="sticky top-16 z-10 bg-white lg:px-10 pt-4 pb-3 lg:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">

                        <button
                            onClick={() => setModalAberto(true)}
                            aria-label="Novo produto"
                            title="Novo produto"
                            className="rounded border border-blue-800 p-2 text-blue-800 hover:cursor-pointer hover:bg-blue-50"
                        >
                            <Plus size={22} />
                        </button>


                        <input
                            type="search"
                            value={pesquisa}
                            onChange={(e) => setPesquisa(e.target.value)}
                            placeholder="Pesquisar produtos..."
                            aria-label="Pesquisar produtos"
                            className="min-w-0 w-full rounded border border-blue-800 px-3 sm:px-4 py-2 outline-none focus:border-blue-600"
                        />
                        </div>
                        <button type="button" onClick={copiarListaCompras} disabled={copiandoLista} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f3a6b] disabled:opacity-50">
                            <ClipboardCopy size={18} />
                            {copiandoLista ? 'Preparando lista...' : 'Copiar lista de compras'}
                        </button>
                    </div>
                    {mensagemLista && <p role="status" className="py-2 text-sm text-gray-600">{mensagemLista}</p>}

                    <div className="hidden lg:grid grid-cols-5 py-5">
                        <h3 className="font-semibold col-span-2">Nome</h3>
                        <p className="font-semibold">Venda</p>
                        <p className="font-semibold">Estoque</p>
                        <p className="font-semibold text-center">Edições</p>
                    </div>
                </div>

                <div className="space-y-3 lg:space-y-0 lg:px-10">
                    {produtosFiltrados.map((p) => (
                        <div key={p.id} className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-0 p-4 lg:px-0 lg:py-2 border lg:border-0 lg:border-b rounded-xl lg:rounded-none border-gray-300 bg-white">
                            <div className="min-w-0 flex items-start gap-3 lg:px-2 col-span-2">
                                <FotoItem foto={p.foto} nome={p.nome} />
                                <div className="min-w-0 break-words">
                                <h3 className="font-semibold">{p.nome}</h3>
                                <p className="text-sm text-gray-500">{p.descricao}</p>
                                </div>
                            </div>

                            <p className="min-w-0 break-words font-semibold text-green-800"><span className="block lg:hidden text-xs text-gray-500 font-normal mb-1">Venda</span>R${p.precoVenda.toFixed(2)}</p>
                            <div className="min-w-0 break-words">
                                <button type="button" title="Atualizar estoque" onClick={() => setProdutoEstoque(p)} className="text-left font-semibold min-h-11 lg:min-h-0 hover:text-blue-700">
                                    <span className="block lg:hidden text-xs text-gray-500 font-normal mb-1">Estoque</span>{p.estoque} UND
                                </button>
                                <p className="mt-1 text-xs text-gray-500">Padrão: {p.estoquePadrao ?? 0} UND</p>
                                {calcularReposicao(p.estoque, p.estoquePadrao) > 0 && <p className="mt-1 text-xs font-semibold text-amber-700">Pedir: {calcularReposicao(p.estoque, p.estoquePadrao)} UND</p>}
                            </div>


                            <div className="col-span-2 lg:col-span-1 flex items-center justify-end lg:justify-center gap-2 lg:gap-3 border-t lg:border-0 pt-2 lg:pt-0">
                                <button
                                    title="Duplicar"
                                    className="mobile-touch-target text-green-800 hover:cursor-pointer"
                                    onClick={() => setProdutoDuplicando(p)}
                                >
                                    <Copy size={20} />
                                </button>
                                <button
                                    aria-label="Editar produto"
                                    className="mobile-touch-target text-amber-500 hover:cursor-pointer"
                                    onClick={() => setProdutoEditando(p)}
                                >
                                    <Pencil size={20} />
                                </button>
                                {administrador && <button
                                    aria-label="Excluir produto"
                                    className="mobile-touch-target text-red-700 hover:cursor-pointer"
                                    onClick={() => handleDeletar(p.id)}
                                >
                                    <Trash2 size={20} />
                                </button>}
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            {produtoEstoque && <ModalEstoque key={produtoEstoque.id} produto={produtoEstoque} administrador={administrador} onClose={() => setProdutoEstoque(null)} onSalvar={handleSalvarProduto} />}
            <ModalProduto
                administrador={administrador}
                isOpen={modalAberto || produtoEditando !== null || produtoDuplicando !== null}
                onClose={() => {
                    setModalAberto(false);
                    setProdutoEditando(null);
                    setProdutoDuplicando(null);
                }}
                title={
                    produtoEditando ? 'Editar Produto'
                        : produtoDuplicando ? 'Duplicar Produto'
                            : 'Novo Produto'
                }
                produtoInicial={produtoEditando ?? produtoDuplicando}
                duplicando={produtoDuplicando !== null}
                onSalvar={handleSalvarProduto}
            />
        </div>
    );
}
