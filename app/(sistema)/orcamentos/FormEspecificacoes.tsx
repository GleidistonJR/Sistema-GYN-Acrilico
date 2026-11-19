"use client";

import { getCategorias, getMateriais } from '../materiais/actions';
import { Material } from '../materiais/page';
import { useCallback, useState } from 'react';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';
import GuiaMedidasCaixa from './GuiaMedidasCaixa';


interface FormEspecificacoesProps {
  modoCalculo: string;
  setModoCalculo: (modo: string) => void;
  tipoMaterial: string;
  setTipoMaterial: (tipo: string) => void;
  corChapa: string;
  setCorChapa: (cor: string) => void;
  espessuraChapa: string;
  setEspessuraChapa: (esp: string) => void;

  comprimentoInp: string;
  setComprimentoInp: (val: string) => void;

  larguraInp: string;
  setLarguraInp: (val: string) => void;

  profundidadeInp: string;
  setProfundidadeInp: (val: string) => void;

  tipoTampa: string;
  setTipoTampa: (tipo: string) => void;

  materialId: string;
  setMaterialId: (id: string) => void;

  temImposto: boolean;
  setTemImposto: (val: boolean) => void;
  temMaoDeObra: boolean;
  setTemMaoDeObra: (val: boolean) => void;
  temProjeto: boolean;
  setTemProjeto: (val: boolean) => void;
  temEspecial: boolean;
  setTemEspecial: (val: boolean) => void;
}

function TituloSecao({ numero, texto }: { numero: number; texto: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-line">
      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-warning-soft text-warning-ink text-xs font-bold shrink-0">
        {numero}
      </span>
      <h2 className="text-lg font-bold text-primary-ink">{texto}</h2>
    </div>
  );
}


const classeInput = "min-w-0 w-full p-2.5 bg-surface-soft border border-line-strong rounded-lg outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400";
const classeSelect = classeInput + " font-medium";

export default function FormEspecificacoes({
  modoCalculo, setModoCalculo,
  tipoMaterial, setTipoMaterial,
  corChapa, setCorChapa,
  espessuraChapa, setEspessuraChapa,

  comprimentoInp, setComprimentoInp,
  larguraInp, setLarguraInp,
  profundidadeInp, setProfundidadeInp,

  tipoTampa, setTipoTampa,

  materialId, setMaterialId,

  temImposto, setTemImposto,
  temMaoDeObra, setTemMaoDeObra,
  temProjeto, setTemProjeto,
  temEspecial, setTemEspecial
}: FormEspecificacoesProps) {

  const buscarCatalogo = useCallback(async () => {
    const [categorias, materiais] = await Promise.all([getCategorias(), getMateriais()]);
    return { categorias, materiais };
  }, []);
  const { dados: { categorias, materiais } } = useDadosAtualizados<{
    categorias: { id: string; nome: string }[];
    materiais: Material[];
  }>(buscarCatalogo, { categorias: [], materiais: [] });

  const [buscaCor, setBuscaCor] = useState('');
  const [focoAberto, setFocoAberto] = useState(false);

  // Espessuras (sem repetição, em ordem numérica) disponíveis em uma categoria
  const espessurasDaCategoria = (nomeCategoria: string) =>
    [...new Set(
      materiais
        .filter((mat) => mat.categoria.nome === nomeCategoria)
        .map((mat) => mat.espessura)
        .filter((esp): esp is string => !!esp)
    )].sort((a, b) => Number(a) - Number(b));

  // 1. Extrai e remove duplicatas das cores válidas vindas do seu array
  const coresValidas = [...new Set(
    materiais
      .filter((mat) =>
        mat.categoria?.nome === tipoMaterial &&
        mat.espessura === espessuraChapa
      )
      .map((mat) => mat.cor)
      .filter((cor): cor is string => !!cor)
  )].sort();

  // 2. Filtra as opções exibidas no menu com base na busca (independente do valor selecionado)
  const opcoesFiltradas = coresValidas.filter((cor) =>
    cor.toLowerCase().includes(buscaCor.toLowerCase())
  );

  const selecionarCor = (cor: string) => {
    setCorChapa(cor);      // Define o valor do estado principal
    setBuscaCor('');        // Limpa o termo de busca para a próxima vez
    setFocoAberto(false);   // Fecha a lista
  };

  // Itens cadastrados na categoria "Personalização", ordenados pelo nome
  const materiaisPersonalizacao = materiais
    .filter((mat) => mat.categoria.nome === 'Personalização' && mat.nome)
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', { sensitivity: 'base' }));

  // Ao trocar o tipo de material: limpa o item escolhido e ajusta a espessura
  // para uma que exista na nova categoria
  const trocarTipoMaterial = (tipo: string) => {
    setTipoMaterial(tipo);
    setMaterialId('');
    setEspessuraChapa(espessurasDaCategoria(tipo)[0] ?? '');
  };

  return (
    <div className="min-w-0 space-y-5 lg:col-span-2">
      {/* Seletor de Modo de Operação */}
      <div className="bg-surface rounded-xl shadow-sm p-1.5 grid grid-cols-2 gap-1.5 border border-line">
        {[
          { valor: 'corte', label: 'Corte' },
          { valor: 'caixa', label: 'Caixa' },
          { valor: 'chapa', label: 'Chapa' },
          { valor: 'perso', label: 'Personalização' },
        ].map(({ valor, label }) => (
          <button
            key={valor}
            type="button"
            onClick={() => { setModoCalculo(valor); setTipoMaterial('Acrílico'); setMaterialId(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${modoCalculo === valor ? 'bg-primary text-white' : 'text-muted hover:bg-surface-muted hover:cursor-pointer'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bloco Material */}
      <section className="bg-surface rounded-xl shadow-sm p-5 space-y-4 border border-line">
        <TituloSecao numero={1} texto="Especificações" />

        {(modoCalculo == 'corte' || modoCalculo == 'chapa') && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-secondary">Tipo de material</label>
            <select
              value={tipoMaterial}
              onChange={(e) => {
                trocarTipoMaterial(e.target.value);
                setCorChapa("");
              }}
              className={classeSelect}
            >
              {categorias
                .filter((cat) => cat.nome !== "Personalização")
                .map((cat) => (
                  <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                ))}
            </select>
          </div>
        )}


        {modoCalculo === 'perso' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-secondary">Tipo de personalização</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className={classeSelect}
            >
              <option value="">Selecione...</option>
              {materiaisPersonalizacao.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.nome}
                </option>
              ))}
            </select>
          </div>
        )}


        {modoCalculo === 'caixa' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-secondary">Tipo de tampa da caixa</label>
            <select value={tipoTampa} onChange={(e) => setTipoTampa(e.target.value)} className={classeSelect}>
              <option value="semTampa">Sem tampa</option>
              <option value="tampaLacrada">Tampa lacrada</option>
              <option value="tampa3cm">Tampa encaixe (abas 3cm)</option>
              <option value="tampaTotal">Tampa encaixe (medida total)</option>
            </select>
          </div>
        )}



        {modoCalculo !== 'perso' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-secondary">Espessura</label>
            <select
              value={espessuraChapa}
              onChange={(e) => {
                setEspessuraChapa(e.target.value);
                setCorChapa("");
              }}
              className={classeSelect}>
              {espessurasDaCategoria(tipoMaterial).map((esp) => (
                <option key={esp} value={esp}>
                  {esp}mm
                </option>
              ))}
            </select>
          </div>
        )}



        {modoCalculo !== 'perso' && (
          <div className="flex flex-col gap-1 relative">
            <label className="text-sm font-medium text-secondary">Cor</label>

            {/* Campo visível que o usuário digita para filtrar */}
            <input
              type="text"
              value={focoAberto ? buscaCor : corChapa}
              onChange={(e) => setBuscaCor(e.target.value)}
              onFocus={() => {
                setBuscaCor(''); // Limpa o texto ao focar para exibir TODAS as opções novamente
                setFocoAberto(true);
              }}
              onBlur={() => {
                // Delay para permitir que o clique na opção seja registrado antes de fechar
                setTimeout(() => setFocoAberto(false), 200);
              }}
              placeholder={corChapa ? corChapa : "Pesquisar cor..."}
              className={classeSelect}
            />

            {/* Lista de opções filtradas */}
            {focoAberto && (
              <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto bg-surface border border-line rounded-md shadow-lg py-1">
                {opcoesFiltradas.length > 0 ? (
                  opcoesFiltradas.map((cor) => (
                    <li
                      key={cor}
                      onMouseDown={() => selecionarCor(cor)} // onMouseDown executa antes do onBlur
                      className="px-3 py-2 text-sm text-secondary hover:bg-surface-muted cursor-pointer transition-colors"
                    >
                      {cor}
                      <span className="ml-2 text-xs text-subtle">
                        ({materiais.find(
                          (mat) =>
                            mat.categoria?.nome === tipoMaterial &&
                            mat.cor === cor &&
                            mat.espessura === espessuraChapa
                        )?.estoque ?? 0} chapas)
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-subtle italic">
                    Nenhuma cor encontrada
                  </li>
                )}
              </ul>
            )}
          </div>

        )}



        {modoCalculo !== 'chapa' ? (
          <div className={`grid gap-4 pt-2 ${modoCalculo === 'corte' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>

            <div className="flex flex-col gap-1">
              <label htmlFor="medida-comprimento" className={`text-xs font-medium ${modoCalculo === 'caixa' ? 'text-info-ink' : 'text-secondary'}`}>{modoCalculo === 'caixa' ? 'C — Comprimento (cm)' : 'Comprimento (cm)'}</label>
              <input
                id="medida-comprimento"
                type="number"
                min="0.01" step="any"
                aria-describedby={modoCalculo === 'caixa' ? 'guia-medidas-caixa' : undefined}
                value={comprimentoInp}
                onChange={(e) => setComprimentoInp(e.target.value)}
                className={classeInput + " text-center font-semibold"}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="medida-largura" className={`text-xs font-medium ${modoCalculo === 'caixa' ? 'text-success-ink' : 'text-secondary'}`}>{modoCalculo === 'caixa' ? 'L — Largura do fundo (cm)' : 'Largura (cm)'}</label>
              <input
                id="medida-largura"
                type="number"
                min="0.01" step="any"
                aria-describedby={modoCalculo === 'caixa' ? 'guia-medidas-caixa' : undefined}
                value={larguraInp}
                onChange={(e) => setLarguraInp(e.target.value)}
                className={classeInput + " text-center font-semibold"}
              />
            </div>


            {modoCalculo === 'caixa' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="medida-altura" className="text-xs font-medium text-violet-ink">A — Altura (cm)</label>
                <input
                  id="medida-altura"
                  type="number"
                  min="0.01" step="any"
                  aria-describedby="guia-medidas-caixa"
                  value={profundidadeInp}
                  onChange={(e) => setProfundidadeInp(e.target.value)}
                  className={classeInput + " text-center font-semibold"}
                />
              </div>
            )}

          </div>
        ) : (
          <div className="p-3 bg-surface-soft border-l-2 border-amber-400 text-secondary rounded-r-lg text-sm font-medium text-center">
            Cálculo baseado na medida padrão da chapa inteira.
          </div>
        )}
        {modoCalculo === 'caixa' && <GuiaMedidasCaixa comprimento={comprimentoInp} largura={larguraInp} altura={profundidadeInp} />}
      </section>



      {/* Bloco Custos Adicionais */}
      <section className="bg-surface rounded-xl shadow-sm p-5 space-y-3 border border-line">
        <TituloSecao numero={2} texto="Custos e serviços adicionais" />
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 sm:gap-3 pt-1">
          {[
            { label: 'Imposto', checked: temImposto, set: setTemImposto },
            { label: 'Mão de obra', checked: temMaoDeObra, set: setTemMaoDeObra },
            { label: 'Projeto', checked: temProjeto, set: setTemProjeto },
            { label: 'Especial', checked: temEspecial, set: setTemEspecial },
          ].map(({ label, checked, set }) => (
            <label
              key={label}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${checked ? 'bg-warning-soft border-warning-line' : 'bg-surface-soft border-line hover:bg-surface-muted'
                }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => set(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded"
              />
              <span className={`font-medium text-sm ${checked ? 'text-warning-ink' : 'text-secondary'}`}>{label}</span>
            </label>
          ))}
        </div>
      </section>
    </div >
  );
}
