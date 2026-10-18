'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Copy } from 'lucide-react';
import { getCookie } from 'cookies-next';
import ModalProduto from './modalProduto';
import { getProdutos, deleteProduto } from './actions';

export interface Produto {
    id: string;
    nome: string;
    descricao: string | null;
    estoque: number;
    precoCusto: number;
    precoVenda: number;
}

export default function ProdutosFinais() {
    const [role, setRole] = useState<string>('USER');

    useEffect(() => {
        const sessaoCookie = getCookie('sessao_admin');
        try {
            const sessao = JSON.parse(sessaoCookie as string);
            setRole(sessao.role);
        } catch {
            setRole('');
        }
    }, []);

    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
    const [pesquisa, setPesquisa] = useState('');

    const [produtoDuplicando, setProdutoDuplicando] = useState<Produto | null>(null);

    useEffect(() => {
        getProdutos().then(setProdutos);
    }, []);

    function handleSalvarProduto(salvo: Produto) {
        setProdutos(prev => {
            const existe = prev.some(p => p.id === salvo.id);
            return existe
                ? prev.map(p => (p.id === salvo.id ? salvo : p))
                : [...prev, salvo];
        });
    }

    async function handleDeletar(id: string) {
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


    return (
        <div>
            <div className="w-6/7 m-auto">

                <div className="sticky top-16 z-10 bg-white px-10 pt-5">
                    <div className="flex items-center gap-3">

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
                            className="w-full rounded border border-blue-800 px-4 py-2 outline-none focus:border-blue-600"
                        />
                    </div>

                    <div className={`grid grid-cols-5 py-5`}>
                        <h3 className="font-semibold col-span-2">Nome</h3>
                        <p className="font-semibold">Venda</p>
                        <p className="font-semibold">Estoque</p>
                        {role === 'ADMIN' && <p className="font-semibold text-center">Edições</p>}
                    </div>
                </div>

                <div className="px-10">
                    {produtosFiltrados.map((p) => (
                        <div key={p.id} className={`grid grid-cols-5 py-2 border-b border-gray-300`}>
                            <div className="px-2 col-span-2">
                                <h3 className="font-semibold">{p.nome}</h3>
                                <p className="text-sm text-gray-500">{p.descricao}</p>
                            </div>

                            <p className="font-semibold text-green-800">R${p.precoVenda.toFixed(2)}</p>
                            <p className="font-semibold">{p.estoque} UND</p>


                            <div className="m-auto space-x-5">
                                <button
                                    title="Duplicar"
                                    className="text-green-800 hover:cursor-pointer"
                                    onClick={() => setProdutoDuplicando(p)}
                                >
                                    <Copy size={20} />
                                </button>
                                <button
                                    className="text-amber-500 hover:cursor-pointer"
                                    onClick={() => setProdutoEditando(p)}
                                >
                                    <Pencil size={20} />
                                </button>
                                <button
                                    className="text-red-700 hover:cursor-pointer"
                                    onClick={() => handleDeletar(p.id)}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            <ModalProduto
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