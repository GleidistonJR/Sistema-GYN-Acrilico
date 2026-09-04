"use client";

import { PERSONALIZACAO_CONFIG } from './utils/constants';
import { getCategorias, getMateriais } from '../administracao/produtos/actions';
import { Material } from '../administracao/produtos/page';
import { useEffect, useState, } from 'react';


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
    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">
        {numero}
      </span>
      <h2 className="text-lg font-bold text-[#0A2540]">{texto}</h2>
    </div>
  );
}


const classeInput = "w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400";
const classeSelect = classeInput + " font-medium";

export default function FormEspecificacoes({
  modoCalculo, setModoCalculo,
  tipoMaterial, setTipoMaterial,
  corChapa, setCorChapa,
  espessuraChapa, setEspessuraChapa,

  comprimentoInp: comprimentoInp,
  setComprimentoInp: setComprimentoInp,

  larguraInp: larguraInp,
  setLarguraInp: setLarguraInp,

  profundidadeInp: profundidadeInp,
  setProfundidadeInp: setProfundidadeInp,

  tipoTampa, setTipoTampa,

  temImposto, setTemImposto,
  temMaoDeObra, setTemMaoDeObra,
  temProjeto, setTemProjeto,
  temEspecial, setTemEspecial
}: FormEspecificacoesProps) {

  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);

  const [buscaCor, setBuscaCor] = useState('');
  const [focoAberto, setFocoAberto] = useState(false);

  // 1. Extrai e remove duplicatas das cores válidas vindas do seu array
  const coresValidas = [...new Set(
    materiais
      .filter((mat) =>
        mat.categoria?.nome === tipoMaterial &&
        mat.espessura === espessuraChapa
      )
      .map((mat) => mat.cor)
      .filter(Boolean)
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


  useEffect(() => {
    getCategorias().then(setCategorias)
    getMateriais().then(setMateriais)
  }, []);

  return (
    <div className="space-y-5 lg:col-span-2">
      {/* Seletor de Modo de Operação */}
      <div className="bg-white rounded-xl shadow-sm p-1.5 flex gap-1.5 border border-slate-200">
        {[
          { valor: 'corte', label: 'Corte' },
          { valor: 'caixa', label: 'Caixa' },
          { valor: 'chapa', label: 'Chapa' },
        ].map(({ valor, label }) => (
          <button
            key={valor}
            type="button"
            onClick={() => { setModoCalculo(valor); setTipoMaterial('Acrílico'); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${modoCalculo === valor ? 'bg-[#0A2540] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bloco Material */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-slate-200">
        <TituloSecao numero={1} texto="Especificações" />

        {(modoCalculo == 'corte' || modoCalculo == 'chapa') && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">Tipo de material</label>
            <select value={tipoMaterial} onChange={(e) => setTipoMaterial(e.target.value)} className={classeSelect}>
              {categorias.map(cat =>
                <option key={cat.id} value={cat.nome}>{cat.nome}</option>

              )}

            </select>
          </div>
        )}


        {modoCalculo === 'caixa' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">Tipo de tampa da caixa</label>
            <select value={tipoTampa} onChange={(e) => setTipoTampa(e.target.value)} className={classeSelect}>
              <option value="semTampa">Sem tampa</option>
              <option value="tampaLacrada">Tampa lacrada</option>
              <option value="tampa3cm">Tampa encaixe (abas 3cm)</option>
              <option value="tampaTotal">Tampa encaixe (medida total)</option>
            </select>
          </div>
        )}


        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Espessura</label>
          <select value={espessuraChapa} onChange={(e) => setEspessuraChapa(e.target.value)} className={classeSelect}>
            {[... new Set(
              materiais
                .filter(mat =>
                  mat.categoria.nome === tipoMaterial
                )
                .map(mat => mat.espessura)
                .filter(Boolean)
            )].sort((a, b) => Number(a) - Number(b)).map(mat =>

              < option key={mat} value={mat}>
                {mat}mm

              </option>

            )}
          </select>
        </div>



        {tipoMaterial === "Acrílico" && (
          <div className="flex flex-col gap-1 relative">
            <label className="text-sm font-medium text-slate-600">Cor</label>

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
              <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto bg-white border border-slate-200 rounded-md shadow-lg py-1">
                {opcoesFiltradas.length > 0 ? (
                  opcoesFiltradas.map((cor) => (
                    <li
                      key={cor}
                      onMouseDown={() => selecionarCor(cor)} // onMouseDown executa antes do onBlur
                      className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      {cor}
                      <span className="ml-2 text-xs text-slate-400">
                        ({materiais.find(
                          mat => mat.cor === cor && mat.espessura === espessuraChapa
                        )?.estoque ?? 0} chapas)
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-slate-400 italic">
                    Nenhuma cor encontrada
                  </li>
                )}
              </ul>
            )}
          </div>

        )}



        {modoCalculo !== 'chapa' ? (
          <div className={`grid gap-4 pt-2 ${modoCalculo === 'corte' ? 'grid-cols-2' : 'grid-cols-3'}`}>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Comprimento (cm)</label>
              <input
                type="number"
                value={comprimentoInp}
                onChange={(e) => setComprimentoInp(e.target.value)}
                className={classeInput + " text-center font-semibold"}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Largura (cm)</label>
              <input
                type="number"
                value={larguraInp}
                onChange={(e) => setLarguraInp(e.target.value)}
                className={classeInput + " text-center font-semibold"}
              />
            </div>


            {modoCalculo === 'caixa' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Profundidade (cm)</label>
                <input
                  type="number"
                  value={profundidadeInp}
                  onChange={(e) => setProfundidadeInp(e.target.value)}
                  className={classeInput + " text-center font-semibold"}
                />
              </div>
            )}

          </div>
        ) : (
          <div className="p-3 bg-slate-50 border-l-2 border-amber-400 text-slate-700 rounded-r-lg text-sm font-medium text-center">
            Cálculo baseado na medida padrão da chapa inteira.
          </div>
        )}
      </section>



      {/* Bloco Custos Adicionais */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-3 border border-slate-200">
        <TituloSecao numero={2} texto="Custos e serviços adicionais" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          {[
            { label: 'Imposto', checked: temImposto, set: setTemImposto },
            { label: 'Mão de obra', checked: temMaoDeObra, set: setTemMaoDeObra },
            { label: 'Projeto', checked: temProjeto, set: setTemProjeto },
            { label: 'Especial', checked: temEspecial, set: setTemEspecial },
          ].map(({ label, checked, set }) => (
            <label
              key={label}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${checked ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => set(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded"
              />
              <span className={`font-medium text-sm ${checked ? 'text-amber-800' : 'text-slate-700'}`}>{label}</span>
            </label>
          ))}
        </div>
      </section>
    </div >
  );
}