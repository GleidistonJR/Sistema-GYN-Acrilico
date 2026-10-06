'use client';

import React, { useState, useEffect } from 'react';
import ModalMaterial from './modalCadastrarMaterial';
import ModalCategoria from './modalCadastrarCategoria';
import { getMateriais, deleteMaterial } from './actions';
import { Eye, Pencil, Trash2, Box, CopyPlus } from 'lucide-react';

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
        <div className="grid grid-cols-7">

            <div className="fixed flex flex-col col-span-1 p-3 gap-3 bg-gray-100 h-dvh">

                <button onClick={() => setModalCategoriaAberto(true)} className="w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg border transition-all duration-150 bg-[#0A2540] border-[#0A2540] text-white hover:bg-[#0f3a6b] hover:cursor-pointer">
                    Cadastrar Categoria
                </button>

                <button onClick={() => setModalAberto(true)} className="w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg border transition-all duration-150 bg-[#0A2540] border-[#0A2540] text-white hover:bg-[#0f3a6b] hover:cursor-pointer">
                    Cadastrar Material
                </button>

                <button className="w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg border transition-all duration-150 bg-[#0A2540] border-[#0A2540] text-white hover:bg-[#0f3a6b] hover:cursor-pointer">
                    Cadastrar Produto
                </button>

            </div>

            <div className='p-10 col-start-3 col-span-4 '>
                <input
                    type="search"
                    value={pesquisa}
                    onChange={(event) => setPesquisa(event.target.value)}
                    placeholder="Pesquisar materiais..."
                    aria-label="Pesquisar materiais"
                    className="mb-5 w-full rounded border border-gray-300 px-4 py-2 outline-none focus:border-green-600"
                />

                {materiaisFiltrados.map((m) => (

                    <div className='grid grid-cols-5 py-2 border-b border-gray-300' key={m.id} >

                        <div className='px-2 col-span-3'>
                            <h3 className='font-semibold'>{
                                m.categoria.nome + " "
                                + m.nome + " "
                                + m.cor + " "
                                + m.espessura + (m.espessura ? "mm " : " ")
                            } </h3>
                            <p>{m.descricao}</p>
                            <p className="text-sm text-gray-500">
                                {m.largura && m.altura ? `${m.largura} x ${m.altura} cm` : ''}
                                {m.velocidadeCorte ? ` | Corte: ${m.velocidadeCorte} mm/s` : ''}
                            </p>
                        </div>

                        <div className='flex justify-between'>

                            <p className='font-semibold text-green-800'>R${m.custo.toFixed(2)}</p>
                            <p className='font-semibold flex gap-2 text-green-800 '>{m.estoque} <Box size={20} /></p>
                        </div>


                        <div className='m-auto space-x-5'>

                            <button className=' text-green-800 rounded-full  hover:cursor-pointer' onClick={() => editarMaterial(m.id)}><CopyPlus size={20} /></button>
                           
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