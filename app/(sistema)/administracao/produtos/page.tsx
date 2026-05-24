'use client';

import React, { useState } from 'react';
import Modal from './modalCadastrar'; // Ajuste o caminho conforme seu projeto

export default function Produtos() {
    // O estado que controla se o modal aparece ou some
    const [modalAberto, setModalAberto] = useState(false);

    return (
        <div className="w-full">
            <h1 className="py-6 text-4xl text-center">Produtos</h1>

            <div className="px-8 flex justify-end">
                <button onClick={() => setModalAberto(true)}
                    className="bg-green-600 text-white px-8 py-1 rounded font-semibold hover:cursor-pointer
                    hover:bg-green-700">Cadastrar Materia Prima</button>
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