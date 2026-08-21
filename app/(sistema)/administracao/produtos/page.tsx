'use client';

import React, { useState, useEffect } from 'react';
import Modal from './modalCadastrarMaterial';
import ModalCategoria from './modalCadastrarCategoria';
import { getMateriais } from './actions';


export default function Produtos() {
    // O estado que controla se o modal aparece ou some
    const [modalAberto, setModalAberto] = useState(false);
    const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);

    const [materiais, setMateriais] = useState<Material[]>([]);

    interface Material {
        id: string;
        nome: string;
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
    useEffect(() => {
        getMateriais().then(setMateriais);

    }, []);

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

                    <div className='flex h-20 items-center justify-between border-b border-gray-300' key={m.id} >

                        <img className='h-full' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGHHthTdT6Nny_ECVSKqIvwtAO1o9hCPI7UGeOekWRBdUqzlAiB6ndsJE1&s=10" alt="Chapa de acrilico" />

                        <div className='px-4'>
                            <h3 className='font-semibold'>{m.nome}</h3>
                            <p>{m.descricao}</p>
                        </div>

                        <p className='font-semibold text-green-800'>R${m.custo},00</p>

                        <div className='flex gap-3'>
                            <button>Excluir </button>
                            <button>Editar</button>
                        </div>

                    </div>
                ))}


            </div>


            {/* Chamada do nosso componente Modal */}
            <Modal
                isOpen={modalAberto}
                onClose={() => setModalAberto(false)}
                title="Novo Material"
            >

            </Modal>

            <ModalCategoria
                isOpen={modalCategoriaAberto}
                onClose={() => setModalCategoriaAberto(false)}
                title="Nova Categoria"
            >

            </ModalCategoria>
        </div >

    );
}