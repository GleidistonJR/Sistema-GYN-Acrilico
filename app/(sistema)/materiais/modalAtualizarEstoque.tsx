'use client';

import React, { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { atualizarEstoque } from './actions';
import type { Material } from './page';

interface ModalEstoqueProps {
    material: Material | null; // null = modal fechado
    onClose: () => void;
    onSalvar: (material: Material) => void;
    administrador: boolean;
}

export default function ModalEstoque({ material, onClose, onSalvar, administrador }: ModalEstoqueProps) {
    const [estoque, setEstoque] = useState<number | null>(0);
    const [estoquePadrao, setEstoquePadrao] = useState(0);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');

    // Preenche com o estoque atual sempre que abrir para outro material
    useEffect(() => {
        if (material) {
            setEstoque(material.estoque);
            setEstoquePadrao(material.estoquePadrao ?? 0);
            setErro('');
        }
    }, [material]);

    // Esc fecha o modal
    useEffect(() => {
        if (!material) return;
        const aoApertarTecla = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', aoApertarTecla);
        return () => window.removeEventListener('keydown', aoApertarTecla);
    }, [material, onClose]);

    if (!material) return null;

    const titulo = [
        material.categoria.nome,
        material.nome,
        material.cor,
        material.espessura ? `${material.espessura}mm` : null,
    ].filter(Boolean).join(' ');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!material || estoque === null || salvando) return;

        setSalvando(true);
        setErro('');
        try {
            const atualizado = await atualizarEstoque(material.id, estoque, administrador ? estoquePadrao : undefined);
            onSalvar(atualizado);
            onClose();
        } catch {
            setErro('Não foi possível salvar o estoque. Confira os valores e tente novamente.');
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <form
                onSubmit={handleSubmit}
                className="modal-panel w-full max-w-sm  rounded-xl border border-gray-100 bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                    <h3 className="text-lg font-bold text-gray-700">Atualizar estoque</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="rounded-lg p-1 font-bold text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4 p-6">
                    <div>
                        <p className="font-semibold">{titulo}</p>
                        <p className="text-sm text-gray-500">Estoque atual: {material.estoque} UND</p>
                    </div>

                    <label className="block">
                        Novo estoque
                        <NumericFormat
                            autoFocus
                            thousandSeparator="."
                            decimalSeparator=","
                            suffix=" UND"
                            decimalScale={1}
                            allowNegative={false}
                            value={estoque}
                            onFocus={(e) => e.target.select()}
                            onValueChange={(v) => setEstoque(v.floatValue ?? null)}
                            className="w-full rounded-lg border bg-gray-50 p-2 outline-none focus:border-blue-500 focus:ring-blue-500"
                            placeholder="0 UND"
                        />
                    </label>

                    {administrador && <label className="block">
                        Estoque padrão
                        <NumericFormat
                            thousandSeparator="."
                            decimalSeparator=","
                            suffix=" UND"
                            decimalScale={0}
                            allowNegative={false}
                            value={estoquePadrao}
                            onValueChange={v => setEstoquePadrao(v.floatValue ?? 0)}
                            className="mt-1 w-full rounded-lg border bg-gray-50 p-2 outline-none focus:border-blue-500"
                        />
                        <span className="block mt-1 text-xs text-gray-500">Quantidade desejada em estoque. Com 0, o material não entra na lista de compras.</span>
                    </label>}
                    {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-300"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={estoque === null || salvando}
                            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                            {salvando ? 'Salvando...' : 'Atualizar'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
