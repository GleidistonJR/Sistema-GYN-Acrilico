'use client';

import React, { useState, useEffect } from 'react';
import ModalMaterial from './modalCadastrarMaterial';
import ModalCategoria from './modalCadastrarCategoria';
import { getMateriais, deleteMaterial } from './actions';
import { Eye, Pencil, Trash2, Box } from 'lucide-react';

export interface Material {
    id: string;
    nome: string | null;
    espessura: string | null;
    cor: string | null;
    descricao: string | null;
    custo: number;
    estoque: number;
    categoriaId: string;
    categoria: {
        id: string;
        nome: string;
    };
}

export default function Produtos() {
    // O estado que controla se o modal aparece ou some
    const [modalAberto, setModalAberto] = useState(false);
    const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);

    const [materiais, setMateriais] = useState<Material[]>([]);
    const [materialEditando, setMaterialEditando] = useState<Material | null>(null);
    const [pesquisa, setPesquisa] = useState('');

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

    const materiaisFiltrados = materiais
        .filter((material) => {
            const termo = pesquisa.trim().toLocaleLowerCase();
            const textoMaterial = [
                material.categoria.nome,
                material.nome,
                material.cor,
                material.espessura,
                material.descricao,
            ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase();

            return textoMaterial.includes(termo);
        })
        .sort((materialA, materialB) => {
            const nomeA = `${materialA.categoria.nome} ${materialA.cor ?? ''} ${materialA.espessura ?? ''}`;
            const nomeB = `${materialB.categoria.nome} ${materialB.cor ?? ''} ${materialB.espessura ?? ''}`;

            return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
        });

    return (
        <div className="grid grid-cols-5">

            <div className="flex flex-col col-span-1 p-5 gap-3 bg-gray-200 h-dvh">

                <button onClick={() => setModalCategoriaAberto(true)} className="bg-green-600 text-white px-8 py-1 rounded font-semibold hover:cursor-pointer hover:bg-green-700">
                    Cadastrar Categoria
                </button>

                <button onClick={() => setModalAberto(true)} className="bg-green-600 text-white px-8 py-1 rounded font-semibold hover:cursor-pointer hover:bg-green-700">
                    Cadastrar Material
                </button>

                <button className="bg-green-600 text-white px-8 py-1 rounded font-semibold hover:cursor-pointer hover:bg-green-700">
                    Cadastrar Produto
                </button>

            </div>

            <div className='p-10 col-span-4 '>
                <input
                    type="search"
                    value={pesquisa}
                    onChange={(event) => setPesquisa(event.target.value)}
                    placeholder="Pesquisar materiais..."
                    aria-label="Pesquisar materiais"
                    className="mb-5 w-full rounded border border-gray-300 px-4 py-2 outline-none focus:border-green-600"
                />

                {materiaisFiltrados.map((m) => (

                    <div className='grid grid-cols-5 py-5 border-b border-gray-300' key={m.id} >

                        <div className='px-4 col-span-3'>
                            <h3 className='font-semibold'>{
                                m.categoria.nome + " "
                                + m.nome + " "
                                + m.cor + " "
                                + m.espessura + (m.espessura ? "mm " : " ")
                                } </h3>
                            <p>{m.descricao}</p>
                        </div>

                        <div className='flex justify-between'>

                            <p className='font-semibold text-green-800'>R${m.custo.toFixed(2)}</p>
                            <p className='font-semibold flex gap-2 text-green-800 '>{m.estoque} <Box size={20} /></p>
                        </div>


                        <div className='m-auto space-x-5'>

                            <button className=' text-amber-500 rounded-full  hover:cursor-pointer' onClick={() => editarMaterial(m.id)}><Pencil size={20} /></button>

                            <button className=' text-red-700 rounded-full  hover:cursor-pointer' onClick={() => deletarMaterial(m.id)}><Trash2 size={20} /></button>

                        </div>

                    </div>
                ))}


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
        </div >

    );
}