'use client';

import React, { useState, useEffect } from 'react';
import ModalMaterial from './modalCadastrarMaterial';
import ModalCategoria from './modalCadastrarCategoria';
import type { Categoria } from './modalCadastrarCategoria';
import ModalGerenciarCategorias from './modalGerenciarCategorias';
import { getMateriais, deleteMaterial, getPermissoesMateriais } from './actions';
import { Pencil, Trash2, Box, CopyPlus, Menu, X, ClipboardCopy } from 'lucide-react';
import Link from 'next/link';
import ModalEstoque from './modalAtualizarEstoque';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';
import { calcularReposicao, montarListaReposicao } from '@/lib/reposicaoMateriais';
import FotoItem from '../components/FotoItem';
import type { FotoResumo } from '@/lib/fotoItem';



export interface Material {
    foto?: FotoResumo | null;
    id: string;
    nome: string | null;
    espessura: string | null;
    cor: string | null;
    descricao: string | null;
    custo: number;
    valorVendaInteiro?: number | null;
    ValorVendaFracionado?: number | null;
    estoque: number;
    estoquePadrao: number;
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

    const { dados: role, carregando: carregandoPermissoes } = useDadosAtualizados(getPermissoesMateriais, null);
    const administrador = role === 'ADMIN';

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
    const [gerenciarCategoriasAberto, setGerenciarCategoriasAberto] = useState(false);

    const { dados: materiais, setDados: setMateriais } = useDadosAtualizados<Material[]>(getMateriais, [], { ativo: !!role });
    const [materialEditando, setMaterialEditando] = useState<Material | null>(null);
    const [pesquisa, setPesquisa] = useState('');

    const [materialEstoque, setMaterialEstoque] = useState<Material | null>(null);

    const [materialDuplicando, setMaterialDuplicando] = useState<Material | null>(null);
    const [copiandoLista, setCopiandoLista] = useState(false);
    const [mensagemLista, setMensagemLista] = useState('');

    async function copiarListaCompras() {
        if (copiandoLista) return;
        setCopiandoLista(true);
        setMensagemLista('');
        try {
            // Use every material and its latest balance, independently of the search filter.
            const atuais = await getMateriais();
            setMateriais(atuais);
            const lista = montarListaReposicao(atuais);
            if (!lista) {
                setMensagemLista('Nenhum material precisa de reposição. Confira se você já cadastrou os estoques padrão.');
                return;
            }
            await navigator.clipboard.writeText(lista);
            setMensagemLista('Lista de compras copiada! Inclui todos os materiais abaixo do estoque padrão.');
        } catch {
            setMensagemLista('Não foi possível copiar a lista. Verifique a conexão e a permissão da área de transferência.');
        } finally {
            setCopiandoLista(false);
        }
    }

    function editarMaterial(id: string) {
        const material = materiais.find(m => m.id === id);
        if (material) setMaterialEditando(material);
    }

    async function deletarMaterial(id: string) {
        await deleteMaterial(id);
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

    function handleSalvarCategoria(categoria: Categoria) {
        setMateriais(atuais => atuais.map(material => material.categoriaId === categoria.id
            ? { ...material, categoria }
            : material));
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


    if (!role) return (
        <div className="mx-auto max-w-lg p-6 text-secondary">
            {carregandoPermissoes ? <p role="status">Carregando materiais...</p> : <>
                <p>Entre novamente para acessar os materiais com suas permissões atualizadas.</p>
                <Link href="/login" className="mt-4 inline-block rounded-lg bg-primary px-4 py-3 text-white">Fazer login</Link>
            </>}
        </div>
    );

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
                        className={`fixed top-0 left-0 z-[60] flex h-dvh w-72 max-w-[calc(100vw-1rem)] overflow-y-auto flex-col gap-3 bg-surface-muted p-5 shadow-xl transition-all duration-300 ${menuAberto ? 'translate-x-0' : 'invisible -translate-x-full'
                            }`}
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <span className="font-bold text-primary-ink">Menu</span>
                            <button
                                onClick={() => setMenuAberto(false)}
                                aria-label="Fechar menu"
                                className="rounded p-1 text-muted hover:cursor-pointer hover:bg-surface-hover"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <button
                            onClick={() => { setMenuAberto(false); setModalCategoriaAberto(true); }}
                            className="w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg border transition-all duration-150 bg-primary border-primary-ink text-white hover:bg-primary-hover hover:cursor-pointer"
                        >
                            Cadastrar Categoria
                        </button>

                        <button
                            onClick={() => { setMenuAberto(false); setGerenciarCategoriasAberto(true); }}
                            className="w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg border transition-all duration-150 bg-primary border-primary-ink text-white hover:bg-primary-hover hover:cursor-pointer"
                        >
                            Gerenciar Categorias
                        </button>

                        <button
                            onClick={() => { setMenuAberto(false); setModalAberto(true); }}
                            className="w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg border transition-all duration-150 bg-primary border-primary-ink text-white hover:bg-primary-hover hover:cursor-pointer"
                        >
                            Cadastrar Material
                        </button>
                    </aside>
                </>
            )}

            <div className='w-full lg:w-6/7 px-3 sm:px-6 lg:px-0 m-auto pb-6'>

                <div className='sticky top-16 z-10 bg-surface lg:px-10 pt-4 pb-3 lg:pb-0'>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                        {role === 'ADMIN' && (
                            <button
                                onClick={() => setMenuAberto(true)}
                                aria-label="Abrir menu"
                                className="rounded border border-blue-800 p-2 text-info-ink hover:cursor-pointer hover:bg-info-soft"
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
                            className="min-w-0 w-full rounded border border-blue-800 px-3 sm:px-4 py-2 outline-none focus:border-blue-600"
                        />
                        </div>
                        <button
                            type="button"
                            onClick={copiarListaCompras}
                            disabled={copiandoLista}
                            className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                        >
                            <ClipboardCopy size={18} />
                            {copiandoLista ? 'Preparando lista...' : 'Copiar lista de compras'}
                        </button>
                    </div>
                    {mensagemLista && <p role="status" className="py-2 text-sm text-secondary">{mensagemLista}</p>}

                    <div className={`hidden lg:grid ${role === 'ADMIN' ? 'grid-cols-5' : 'grid-cols-4'} py-5`}>

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


                <div className='space-y-3 lg:space-y-0 lg:px-10'>

                    {materiaisFiltrados.map((m) => (

                        <div className={`grid grid-cols-1 gap-4 lg:gap-0 ${role === 'ADMIN' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} p-4 lg:px-0 lg:py-2 border lg:border-0 lg:border-b rounded-xl lg:rounded-none border-line-strong bg-surface`} key={m.id} >

                            <div className='min-w-0 flex items-start gap-3 lg:px-2 lg:col-span-2'>
                                <FotoItem foto={m.foto} nome={[m.categoria.nome, m.nome, m.cor, m.espessura ? `${m.espessura}mm` : null].filter(Boolean).join(' ')} />
                                <div className="min-w-0 break-words">
                                <h3 className='font-semibold'>
                                    {[
                                        m.categoria.nome,
                                        m.nome,
                                        m.cor,
                                        m.espessura ? `${m.espessura}mm` : null,
                                    ].filter(Boolean).join(' ')}
                                </h3>
                                <p>{m.descricao}</p>
                                <p className="text-sm text-muted">
                                    {m.largura && m.altura ? `${m.largura} x ${m.altura} cm` : ''}
                                    {m.velocidadeCorte ? ` | Corte: ${m.velocidadeCorte} mm/s` : ''}
                                </p>
                                </div>
                            </div>

                            <div className='grid grid-cols-2 min-[400px]:grid-cols-3 gap-3 lg:gap-10 font-semibold lg:col-span-2 text-sm lg:text-base [&>p]:break-words'>

                                {m.valorVendaInteiro ? (
                                    <p className='text-success-ink'><span className="block lg:hidden text-xs text-muted font-normal mb-1">Venda inteira</span>R${m.valorVendaInteiro.toFixed(2)}</p>
                                ) : <p className='text-success-ink'><span className="block lg:hidden text-xs text-muted font-normal mb-1">Venda inteira</span>R$0</p>}

                                {m.ValorVendaFracionado ? (
                                    <p className='text-success-ink'><span className="block lg:hidden text-xs text-muted font-normal mb-1">Venda m²</span>R${m.ValorVendaFracionado.toFixed(2)}</p>
                                ) : <p className='text-success-ink'><span className="block lg:hidden text-xs text-muted font-normal mb-1">Venda m²</span>R$0</p>}

                                <div className="min-w-0">
                                <button
                                    onClick={() => setMaterialEstoque(m)}
                                    title="Atualizar estoque"
                                    className='flex flex-col items-start lg:block min-h-11 lg:min-h-0 hover:cursor-pointer hover:text-info-ink'
                                >
                                    <span className="block lg:hidden text-xs text-muted font-normal mb-1">Estoque</span>
                                    <span className="flex items-center gap-2">{m.estoque} <Box size={20} /></span>
                                </button>
                                <p className="mt-1 text-xs font-normal text-muted">Padrão: {m.estoquePadrao ?? 0} UND</p>
                                {calcularReposicao(m.estoque, m.estoquePadrao) > 0 && (
                                    <p className="mt-1 text-xs font-semibold text-warning-ink">Pedir: {calcularReposicao(m.estoque, m.estoquePadrao)} UND</p>
                                )}
                                </div>
                            </div>

                            {role === 'ADMIN' && (
                                <div className='flex items-center justify-end lg:justify-center gap-2 lg:gap-3 border-t lg:border-0 pt-2 lg:pt-0'>

                                    <button
                                        title="Duplicar"
                                        className='mobile-touch-target text-success-ink rounded-full hover:cursor-pointer'
                                        onClick={() => setMaterialDuplicando(m)}
                                    >
                                        <CopyPlus size={20} />
                                    </button>

                                    <button
                                        aria-label="Editar material"
                                        className='mobile-touch-target text-warning-ink rounded-full hover:cursor-pointer'
                                        onClick={() => editarMaterial(m.id)}>
                                        <Pencil size={20} />
                                    </button>

                                    <button
                                        aria-label="Excluir material"
                                        className='mobile-touch-target text-danger-ink rounded-full hover:cursor-pointer'
                                        onClick={() => deletarMaterial(m.id)}>
                                        <Trash2 size={20} />
                                    </button>

                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>


            {/* Chamada do nosso componente Modal */}
            {administrador && <ModalMaterial
                isOpen={modalAberto || materialEditando !== null || materialDuplicando !== null}
                onClose={() => {
                    setModalAberto(false);
                    setMaterialEditando(null);
                    setMaterialDuplicando(null);
                }}
                title={
                    materialEditando ? "Editar Material"
                        : materialDuplicando ? "Duplicar Material"
                            : "Novo Material"
                }
                materialInicial={materialEditando ?? materialDuplicando}
                duplicando={materialDuplicando !== null}
                onSalvar={handleSalvarMaterial}
            />}

            {administrador && modalCategoriaAberto && <ModalCategoria
                isOpen
                onClose={() => setModalCategoriaAberto(false)}
                title="Nova Categoria"
                onSalvar={handleSalvarCategoria}
            />}

            {administrador && gerenciarCategoriasAberto && <ModalGerenciarCategorias
                onClose={() => setGerenciarCategoriasAberto(false)}
                onSalvar={handleSalvarCategoria}
            />}

            <ModalEstoque
                administrador={administrador}
                material={materialEstoque}
                onClose={() => setMaterialEstoque(null)}
                onSalvar={handleSalvarMaterial}
            />
        </div >

    );
}
