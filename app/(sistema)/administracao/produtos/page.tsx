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

                {materiais.map((m) => (

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

                            <p className='font-semibold text-green-800'>R${m.custo},00</p>
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