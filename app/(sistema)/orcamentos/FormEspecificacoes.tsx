"use client";

import { PERSONALIZACAO_CONFIG } from './constants';

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
  // Estados do Checklist
  temImposto: boolean;
  setTemImposto: (val: boolean) => void;
  temMaoDeObra: boolean;
  setTemMaoDeObra: (val: boolean) => void;
  temProjeto: boolean;
  setTemProjeto: (val: boolean) => void;
  temEspecial: boolean;
  setTemEspecial: (val: boolean) => void;
}

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
    <div className="space-y-6 lg:col-span-2">
      {/* Seletor de Modo de Operação */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-2 border border-gray-100">
        <button
          type="button"
          onClick={() => { setModoCalculo('chapa'); setTipoMaterial('acrilico'); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${modoCalculo === 'chapa' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Chapa Cortada
        </button>
        <button
          type="button"
          onClick={() => { setModoCalculo('caixa'); setTipoMaterial('acrilico'); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${modoCalculo === 'caixa' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Caixa em acrilico
        </button>
        <button
          type="button"
          onClick={() => { setModoCalculo('chapaInteira'); setTipoMaterial('acrilico'); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${modoCalculo === 'chapaInteira' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Chapa Inteira
        </button>
      </div>

      {/* Bloco Material */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-700 pb-2 border-b border-gray-100">1. Especificações</h2>

        {modoCalculo === 'chapa' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Tipo de Material</label>
            <select
              value={tipoMaterial}
              onChange={(e) => setTipoMaterial(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
            >
              <option value="acrilico">Acrílico</option>
              <option value="pvc">PVC</option>
              <option value="abs">ABS - Trotek</option>
              <option value="espelhado">Espelhado</option>
            </select>
          </div>
        )}

        {modoCalculo === 'caixa' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Tipo de Tampa da Caixa</label>
            <select
              value={tipoTampa}
              onChange={(e) => setTipoTampa(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none font-medium"
            >
              <option value="semTampa">Sem Tampa</option>
              <option value="tampaLacrada">Tampa Lacrada</option>
              <option value="tampa3cm">Tampa Encaixe (Abas 3cm)</option>
              <option value="tampaTotal">Tampa Encaixe (Medida Total)</option>
            </select>
          </div>
        )}

        {modoCalculo === 'chapaInteira' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Tipo de Material (Chapa Inteira)</label>
            <select
              value={tipoMaterial}
              onChange={(e) => setTipoMaterial(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
            >
              <option value="acrilico">Acrílico</option>
              <option value="pvc">PVC</option>
              <option value="abs">ABS-Trotek</option>
              <option value="espelhado">Espelhado</option>
              <option value="psai">PS AI</option>
            </select>
          </div>
        )}

        {tipoMaterial === "acrilico" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Cor do Material</label>
              <select
                value={corChapa}
                onChange={(e) => setCorChapa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
              >
                <option value="cristal">Cristal</option>
                <option value="colorido">Colorido (1.2x)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Espessura</label>
              <select
                value={espessuraChapa}
                onChange={(e) => setEspessuraChapa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
              >
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
              <label className="text-xs font-medium text-gray-600">Comprimento X (cm)</label>
              <input
                type="number"
                value={larguraChapa}
                onChange={(e) => setLarguraChapa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center font-semibold"
              />
            </div>

            {modoCalculo === 'caixa' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Largura Y (cm)</label>
                <input
                  type="number"
                  value={profundidadeCaixa}
                  onChange={(e) => setProfundidadeCaixa(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center font-semibold focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                {modoCalculo === 'chapa' ? 'Largura Y (cm)' : 'Altura Z (cm)'}
              </label>
              <input
                type="number"
                value={alturaChapa}
                onChange={(e) => setAlturaChapa(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center font-semibold"
              />
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium text-center">
            Cálculo baseado na medida padrão da chapa inteira (2x1 metros ou correspondente).
          </div>
        )}
      </section>

      {/* Bloco Personalização */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-700 pb-2 border-b border-gray-100">2. Personalização</h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Tipo de Personalização</label>
          <select
            value={tipoPers}
            onChange={(e) => setTipoPers(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none"
          >
            {Object.entries(PERSONALIZACAO_CONFIG).map(([chave, conf]) => (
              <option key={chave} value={chave}>{conf.label}</option>
            ))}
          </select>
        </div>

        {tipoPers !== 'nenhum' && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Comprimento (cm)</label>
              <input
                type="number"
                value={larguraPers}
                onChange={(e) => setLarguraPers(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Largura (cm)</label>
              <input
                type="number"
                value={alturaPers}
                onChange={(e) => setAlturaPers(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-center"
              />
            </div>
          </div>
        )}
      </section>

      {/* Bloco Adicionais (Checklist de Serviços) */}
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-3 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-700 pb-2 border-b border-gray-100">3. Custos e Serviços Adicionais</h2>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 select-none">
            <input
              type="checkbox"
              checked={temImposto}
              onChange={(e) => setTemImposto(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700 text-sm">Imposto (+15%)</span>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 select-none">
            <input
              type="checkbox"
              checked={temMaoDeObra}
              onChange={(e) => setTemMaoDeObra(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700 text-sm">Mão de Obra (+30%)</span>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 select-none">
            <input
              type="checkbox"
              checked={temProjeto}
              onChange={(e) => setTemProjeto(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700 text-sm">Projeto (+30%)</span>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 select-none">
            <input
              type="checkbox"
              checked={temEspecial}
              onChange={(e) => setTemEspecial(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700 text-sm">Especial (+35%)</span>
          </label>
        </div>
      </section>
    </div>
  );
}