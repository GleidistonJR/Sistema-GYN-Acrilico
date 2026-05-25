'use client';

import React, { useState } from 'react';
import Modal from './modalCadastrar'; // Ajuste o caminho conforme seu projeto

export default function Produtos() {
    // O estado que controla se o modal aparece ou some
    const [modalAberto, setModalAberto] = useState(false);

    return (
        <div className="w-full py-10">

            <div className="px-8 flex justify-around">
                <button onClick={() => setModalAberto(true)}
                    className="bg-green-600 text-white px-8 py-1 rounded font-semibold hover:cursor-pointer
                    hover:bg-green-700">Cadastrar Insumo</button>

                <button onClick={() => setModalAberto(true)}
                    className="bg-green-600 text-white px-8 py-1 rounded font-semibold hover:cursor-pointer
                    hover:bg-green-700">Cadastrar Produto</button>
            </div>

            <div className='w-full'>

            </div>


            {/* Chamada do nosso componente Modal */}
            <Modal
                isOpen={modalAberto}
                onClose={() => setModalAberto(false)}
                title="Nova Materia Prima"
            >

            </Modal>
        </div >

    );
}