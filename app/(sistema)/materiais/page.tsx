'use client';

import React, { useState, useEffect } from 'react';
import ModalMaterial from './modalCadastrarMaterial';
import ModalCategoria from './modalCadastrarCategoria';
import { getMateriais, deleteMaterial } from './actions';
import { Eye, Pencil, Trash2, Box, CopyPlus, Menu, X } from 'lucide-react';
import { getCookie } from 'cookies-next';
import ModalEstoque from './modalAtualizarEstoque';



export interface Material {
    id: string;
    nome: string | null;
    espessura: string | null;
    cor: string | null;
    descricao: string | null;
    custo: number;
    valorVendaInteiro?: number | null;
    ValorVendaFracionado?: number | null;
    estoque: number;
    categoriaId: string;
    largura: number | null;
    altura: number | null;
    velocidadeCorte: number | null;
    categoria: {
        id: string;
        nome: string;
    };

}



export default function Produtos() {

    const [role, setRole] = useState<string>('USER');

    useEffect(() => {
        const sessaoCookie = getCookie('sessao_admin');

        try {
            const sessao = JSON.parse(sessaoCookie as string)
            setRole(sessao.role)
        } catch {
            setRole('')
        }

    }, []);

    //Sanduiche Menu criar produtos
    const [menuAberto, setMenuAberto] = useState(false);

    useEffect(() => {
        const aoApertarTecla = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuAberto(false);
        };
        window.addEventListener('keydown', aoApertarTecla);
        return () => window.removeEventListener('keydown', aoApertarTecla);
    }, []);

    // O estado que controla se o modal aparece ou some
    const [modalAberto, setModalAberto] = useState(false);
    const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);

    const [materiais, setMateriais] = useState<Material[]>([]);
    const [materialEditando, setMaterialEditando] = useState<Material | null>(null);
    const [pesquisa, setPesquisa] = useState('');

    const [materialEstoque, setMaterialEstoque] = useState<Material | null>(null);

    useEffect(() => {
        getMateriais().then(setMateriais);

    }, []);

    function editarMaterial(id: string) {
        const material = materiais.find(m => m.id === id);
        if (material) setMaterialEditando(material);
    }

    function deletarMaterial(id: string) {
        deleteMaterial(id)
        setMateriais(prev => prev.filter(c => c.id !== id));
    }

    function handleSalvarMaterial(materialSalvo: Material) {
        setMateriais(prev => {
            const existe = prev.some(m => m.id === materialSalvo.id);
            if (existe) {
                // edição: substitui o item atualizado
                return prev.map(m => m.id === materialSalvo.id ? materialSalvo : m);
            }
            // criação: adiciona no final
            return [...prev, materialSalvo];
        });
    }

    // Remove acentos e deixa em minúsculas ("Acrílico" → "acrilico")
    const normalizar = (texto: string) =>
        texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

    const termos = normalizar(pesquisa).split(/\s+/).filter(Boolean);

    const materiaisFiltrados = materiais
        .filter((material) => {
            // Mesmo texto que aparece no card, com a espessura já com "mm"
            const palavras = normalizar(
                [
                    material.categoria.nome,
                    material.nome,
                    material.cor,
                    material.espessura ? `${material.espessura}mm` : null,
                    material.descricao,
                ]
                    .filter(Boolean)
                    .join(' ')
            ).split(/\s+/);

            // Cada palavra pesquisada precisa ser o começo de alguma palavra do material
            return termos.every((termo) =>
                palavras.some((palavra) => palavra.startsWith(termo))
            );
        })
        .sort((materialA, materialB) => {
            const nomeA = `${materialA.categoria.nome} ${materialA.cor ?? ''} ${materialA.espessura ?? ''}`;
            const nomeB = `${materialB.categoria.nome} ${materialB.cor ?? ''} ${materialB.espessura ?? ''}`;

            return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
        });


    return (
        <div>

            {role === 'ADMIN' && (
                <>
                    {/* Fundo escuro: clicar fora fecha o menu */}
                    <div
                        onClick={() => setMenuAberto(false)}
                        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${menuAberto ? 'opacity-100' : 'pointer-events-none opacity-0'
                            }`}
                    />

                    {/* Gaveta lateral */}
                    <aside
                        aria-hidden={!menuAberto}
                        className={`fixed top-0 left-0 z-50 flex h-dvh w-72 flex-col gap-3 bg-gray-100 p-5 shadow-xl transition-all duration-300 ${menuAberto ? 'translate-x-0' : 'invisible -translate-x-full'
                            }`}
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <span className="font-bold text-[#0A2540]">Menu</span>
                            <button
                                onClick={() => setMenuAberto(false)}
                                aria-label="Fechar menu"
                                className="rounded p-1 text-gray-500 hover:cursor-pointer hover:bg-gray-200"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <button
                            onClick={() => { setMenuAberto(false); setModalCategoriaAberto(true); }}
                            className="w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg border transition-all duration-150 bg-[#0A2540] border-[#0A2540] text-white hover:bg-[#0f3a6b] hover:cursor-pointer"
                        >
                            Cadastrar Categoria
                        </button>

                        <button
                            onClick={() => { setMenuAberto(false); setModalAberto(true); }}
                            className="w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg border transition-all duration-150 bg-[#0A2540] border-[#0A2540] text-white hover:bg-[#0f3a6b] hover:cursor-pointer"
                        >
                            Cadastrar Material
                        </button>
                    </aside>
                </>
            )}

            <div className='w-6/7 m-auto'>

                <div className='sticky top-16 z-10 bg-white  px-10 pt-5'>
                    <div className="flex items-center gap-3">
                        {role === 'ADMIN' && (
                            <button
                                onClick={() => setMenuAberto(true)}
                                aria-label="Abrir menu"
                                className="rounded border border-blue-800 p-2 text-blue-800 hover:cursor-pointer hover:bg-blue-50"
                            >
                                <Menu size={22} />
                            </button>
                        )}

                        <input
                            type="search"
                            value={pesquisa}
                            onChange={(event) => setPesquisa(event.target.value)}
                            placeholder="Pesquisar materiais..."
                            aria-label="Pesquisar materiais"
                            className="w-full rounded border border-blue-800 px-4 py-2 outline-none focus:border-blue-600"
                        />
                    </div>

                    <div className={`grid ${role === 'ADMIN' ? 'grid-cols-5' : 'grid-cols-4'} py-5`}>

                        <h3 className='font-semibold col-span-2'>
                            Nome
                        </h3>
                        <div className='grid grid-cols-3 gap-10 font-semibold col-span-2'>
                            <p>Venda</p>
                            <p>Venda M2</p>
                            <p>Estoque </p>
                        </div>

                        {role === 'ADMIN' && (
                            <p className='font-semibold text-center'>Edições</p>
                        )}

                    </div>
                </div>


                <div className='px-10'>

                    {materiaisFiltrados.map((m) => (

                        <div className={`grid ${role === 'ADMIN' ? 'grid-cols-5' : 'grid-cols-4'} py-2 border-b border-gray-300`} key={m.id} >

                            <div className='px-2 col-span-2'>
                                <h3 className='font-semibold'>
                                    {[
                                        m.categoria.nome,
                                        m.nome,
                                        m.cor,
                                        m.espessura ? `${m.espessura}mm` : null,
                                    ].filter(Boolean).join(' ')}
                                </h3>
                                <p>{m.descricao}</p>
                                <p className="text-sm text-gray-500">
                                    {m.largura && m.altura ? `${m.largura} x ${m.altura} cm` : ''}
                                    {m.velocidadeCorte ? ` | Corte: ${m.velocidadeCorte} mm/s` : ''}
                                </p>
                            </div>

                            <div className='grid grid-cols-3 gap-10 font-semibold col-span-2'>

                                {m.valorVendaInteiro ? (
                                    <p className=' text-green-800'>R${m.valorVendaInteiro.toFixed(2)}</p>
                                ) : <p className=' text-green-800'>R$0</p>}

                                {m.ValorVendaFracionado ? (
                                    <p className=' text-green-800'>R${m.ValorVendaFracionado.toFixed(2)}</p>
                                ) : <p className=' text-green-800'>R$0</p>}

                                <button
                                    onClick={() => setMaterialEstoque(m)}
                                    title="Atualizar estoque"
                                    className='flex gap-2 hover:cursor-pointer hover:text-blue-700'
                                >
                                    {m.estoque} <Box size={20} />
                                </button>
                            </div>

                            {role === 'ADMIN' && (
                                <div className='m-auto space-x-5'>

                                    <button className=' text-green-800 rounded-full  hover:cursor-pointer' onClick={() => editarMaterial(m.id)}><CopyPlus size={20} /></button>

                                    <button className=' text-amber-500 rounded-full  hover:cursor-pointer' onClick={() => editarMaterial(m.id)}><Pencil size={20} /></button>

                                    <button className=' text-red-700 rounded-full  hover:cursor-pointer' onClick={() => deletarMaterial(m.id)}><Trash2 size={20} /></button>

                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>


            {/* Chamada do nosso componente Modal */}
            <ModalMaterial
                isOpen={modalAberto || materialEditando !== null}
                onClose={() => {
                    setModalAberto(false);
                    setMaterialEditando(null);
                }
                }
                title={materialEditando ? "Editar Material" : "Novo Material"}
                materialInicial={materialEditando}
                onSalvar={handleSalvarMaterial}
            >
            </ModalMaterial>

            <ModalCategoria
                isOpen={modalCategoriaAberto}
                onClose={() => setModalCategoriaAberto(false)}
                title="Nova Categoria"
            >
            </ModalCategoria>

            <ModalEstoque
                material={materialEstoque}
                onClose={() => setMaterialEstoque(null)}
                onSalvar={handleSalvarMaterial}
            />
        </div >

    );
}