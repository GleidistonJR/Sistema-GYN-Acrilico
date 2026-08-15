"use client";

import { PERSONALIZACAO_CONFIG } from './utils/constants';

interface FormEspecificacoesProps {
  modoCalculo: string;
  setModoCalculo: (modo: string) => void;
  tipoMaterial: string;
  setTipoMaterial: (tipo: string) => void;
  corChapa: string;
  setCorChapa: (cor: string) => void;
  espessuraChapa: string;
  setEspessuraChapa: (esp: string) => void;
  larguraChapa: string;
  setLarguraChapa: (val: string) => void;
  alturaChapa: string;
  setAlturaChapa: (val: string) => void;
  profundidadeCaixa: string;
  setProfundidadeCaixa: (val: string) => void;
  tipoTampa: string;
  setTipoTampa: (tipo: string) => void;
  tipoPers: string;
  setTipoPers: (tipo: string) => void;
  larguraPers: string;
  setLarguraPers: (val: string) => void;
  alturaPers: string;
  setAlturaPers: (val: string) => void;
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
  larguraChapa, setLarguraChapa,
  alturaChapa, setAlturaChapa,
  profundidadeCaixa, setProfundidadeCaixa,
  tipoTampa, setTipoTampa,
  tipoPers, setTipoPers,
  larguraPers, setLarguraPers,
  alturaPers, setAlturaPers,
  temImposto, setTemImposto,
  temMaoDeObra, setTemMaoDeObra,
  temProjeto, setTemProjeto,
  temEspecial, setTemEspecial
}: FormEspecificacoesProps) {
  return (
    <div className="space-y-5 lg:col-span-2">
      {/* Seletor de Modo de Operação */}
      <div className="bg-white rounded-xl shadow-sm p-1.5 flex gap-1.5 border border-slate-200">
        {[
          { valor: 'chapa', label: 'Chapa cortada' },
          { valor: 'caixa', label: 'Caixa em acrílico' },
          { valor: 'chapaInteira', label: 'Chapa inteira' },
        ].map(({ valor, label }) => (
          <button
            key={valor}
            type="button"
            onClick={() => { setModoCalculo(valor); setTipoMaterial('acrilico'); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
              modoCalculo === valor ? 'bg-[#0A2540] text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bloco Material */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-slate-200">
        <TituloSecao numero={1} texto="Especificações" />

        {(modoCalculo == 'chapa' || modoCalculo == 'chapaInteira') && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">Tipo de material</label>
            <select value={tipoMaterial} onChange={(e) => setTipoMaterial(e.target.value)} className={classeSelect}>
              <option value="acrilico">Acrílico</option>
              <option value="pvc">PVC</option>
              <option value="abs">ABS - Trotek</option>
              <option value="espelhado">Espelhado</option>
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

        {tipoMaterial == "acrilico" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">Cor do material</label>
              <select value={corChapa} onChange={(e) => setCorChapa(e.target.value)} className={classeSelect}>
                <option value="cristal">Cristal</option>
                <option value="colorido">Colorido (1.2x)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">Espessura</label>
              <select value={espessuraChapa} onChange={(e) => setEspessuraChapa(e.target.value)} className={classeSelect}>
                {['2', '3', '4', '5', '6', '8', '10', '12', '15', '20'].map(esp => (
                  <option key={esp} value={esp}>{esp}mm</option>
                ))}
              </select>
            </div>
          </>
        )}

        {modoCalculo !== 'chapaInteira' ? (
          <div className={`grid gap-4 pt-2 ${modoCalculo === 'chapa' ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Comprimento X (cm)</label>
              <input
                type="number"
                value={larguraChapa}
                onChange={(e) => setLarguraChapa(e.target.value)}
                className={classeInput + " text-center font-semibold"}
              />
            </div>

            {modoCalculo === 'caixa' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Largura Y (cm)</label>
                <input
                  type="number"
                  value={profundidadeCaixa}
                  onChange={(e) => setProfundidadeCaixa(e.target.value)}
                  className={classeInput + " text-center font-semibold"}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {modoCalculo === 'chapa' ? 'Largura Y (cm)' : 'Altura Z (cm)'}
              </label>
              <input
                type="number"
                value={alturaChapa}
                onChange={(e) => setAlturaChapa(e.target.value)}
                className={classeInput + " text-center font-semibold"}
              />
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border-l-2 border-amber-400 text-slate-700 rounded-r-lg text-sm font-medium text-center">
            Cálculo baseado na medida padrão da chapa inteira (2x1 metros ou correspondente).
          </div>
        )}
      </section>

      {/* Bloco Personalização */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-slate-200">
        <TituloSecao numero={2} texto="Personalização" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Tipo de personalização</label>
          <select value={tipoPers} onChange={(e) => setTipoPers(e.target.value)} className={classeSelect}>
            {Object.entries(PERSONALIZACAO_CONFIG).map(([chave, conf]) => (
              <option key={chave} value={chave}>{conf.label}</option>
            ))}
          </select>
        </div>

        {tipoPers !== 'nenhum' && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">Comprimento (cm)</label>
              <input
                type="number"
                value={larguraPers}
                onChange={(e) => setLarguraPers(e.target.value)}
                className={classeInput + " text-center"}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">Largura (cm)</label>
              <input
                type="number"
                value={alturaPers}
                onChange={(e) => setAlturaPers(e.target.value)}
                className={classeInput + " text-center"}
              />
            </div>
          </div>
        )}
      </section>

      {/* Bloco Custos Adicionais */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-3 border border-slate-200">
        <TituloSecao numero={3} texto="Custos e serviços adicionais" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          {[
            { label: 'Imposto', checked: temImposto, set: setTemImposto },
            { label: 'Mão de obra', checked: temMaoDeObra, set: setTemMaoDeObra },
            { label: 'Projeto', checked: temProjeto, set: setTemProjeto },
            { label: 'Especial', checked: temEspecial, set: setTemEspecial },
          ].map(({ label, checked, set }) => (
            <label
              key={label}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                checked ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
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
    </div>
  );
}