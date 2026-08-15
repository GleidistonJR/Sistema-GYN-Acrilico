"use client";

import React, { useState, useMemo } from 'react';
import { ItemOrcamento } from './utils/constants';
import MenuLateral from './MenuLateral';
import FormEspecificacoes from './FormEspecificacoes';
import ResumoOrcamento from './ResumoOrcamento';
import { calcularOrcamentoItem } from './utils/calculos'; // Importamos a função limpa

export default function CalculadorChapa() {
  // 1. Estados de Controle de Interface
  const [isOpen, setIsOpen] = useState(false);

  const [copiado, setCopiado] = useState(false);

  // 2. Estados do Formulário de Especificações
  const [modoCalculoInp, setModoCalculoInp] = useState('chapa');
  const [tipoDeChapaInp, setTipoDeChapaInp] = useState('acrilico');
  const [corChapaAcrilicoInp, setCorChapaAcrilicoInp] = useState('cristal');
  const [espessuraChapaInp, setEspessuraChapaInp] = useState('2');
  const [larguraChapaInp, setLarguraChapaInp] = useState('0');
  const [alturaChapaInp, setAlturaChapaInp] = useState('0');
  const [profundidadeChapaInp, setProfundidadeChapaInp] = useState('0');
  const [tipoTampaCaixaInp, setTipoTampaCaixaInp] = useState('semTampa');
  const [tipoPersInp, setTipoPersInp] = useState('nenhum');
  const [larguraPersInp, setLarguraPersInp] = useState('0');
  const [alturaPersInp, setAlturaPersInp] = useState('0');
  const [qtdItemInp, setQtdItemInp] = useState(1);

  // 3. Estados das Taxas
  const [impostoInp, setImpostoInp] = useState(true);
  const [maoDeObraInp, setMaoDeObraInp] = useState(true);
  const [projetoInp, setProjetoInp] = useState(true);
  const [especialInp, setEspecialInp] = useState(false);

  // 4. Lista Final de Itens
  const [itens, setItens] = useState<ItemOrcamento[]>([]);

  function CarregarEdicao(id: string) {

    // 1. Busca na lista o item que tem esse id
    const itemModificando = itens.find(item => item.id === id);

    if (itemModificando) {
      setModoCalculoInp(String(itemModificando.modoCalculo));
      setTipoDeChapaInp(String(itemModificando.tipoDeChapa));
      setCorChapaAcrilicoInp(String(itemModificando.corChapa));
      setEspessuraChapaInp(String(itemModificando.espessuraChapa));
      setLarguraChapaInp(String(itemModificando.larguraChapa));
      setAlturaChapaInp(String(itemModificando.alturaChapa));
      setProfundidadeChapaInp(String(itemModificando.profundidadeCaixa));
      setTipoTampaCaixaInp(String(itemModificando.tipoTampa));
      setTipoPersInp(String(itemModificando.tipoPers));
      setLarguraPersInp(String(itemModificando.larguraPers));
      setAlturaPersInp(String(itemModificando.alturaPers));
      setQtdItemInp(itemModificando.quantidade);
      
      setImpostoInp(itemModificando.taxasAplicadas.temImposto);
      setMaoDeObraInp(itemModificando.taxasAplicadas.temMaoDeObra);
      setProjetoInp(itemModificando.taxasAplicadas.temProjeto);
      setEspecialInp(itemModificando.taxasAplicadas.temEspecial);

    }
    //setIsModalEdicaoOpen(true);
  };



  // EXECUÇÃO DA FUNÇÃO: O código de cálculo agora ocupa só 3 linhas!
  const calculoAtual = useMemo(() => {
    return calcularOrcamentoItem({
      modoCalculo: modoCalculoInp, tipoMaterial: tipoDeChapaInp, corChapa: corChapaAcrilicoInp, espessuraChapa: espessuraChapaInp, larguraChapa: larguraChapaInp,
      alturaChapa: alturaChapaInp, profundidadeCaixa: profundidadeChapaInp, tipoTampa: tipoTampaCaixaInp, tipoPers: tipoPersInp, larguraPers: larguraPersInp,
      alturaPers: alturaPersInp, quantidade: qtdItemInp, temImposto: impostoInp, temMaoDeObra: maoDeObraInp, temProjeto: projetoInp, temEspecial: especialInp
    });
  }, [modoCalculoInp, tipoDeChapaInp, corChapaAcrilicoInp, espessuraChapaInp, larguraChapaInp, alturaChapaInp, profundidadeChapaInp, tipoTampaCaixaInp, tipoPersInp, larguraPersInp, alturaPersInp, qtdItemInp, impostoInp, maoDeObraInp, projetoInp, especialInp]);

  // Ações da Aplicação
  const handleAdicionarItem = () => {
    if (modoCalculoInp !== 'chapaInteira' && (Number(larguraChapaInp) <= 0 || Number(alturaChapaInp) <= 0)) {
      return alert("Medidas inválidas!");
    }

    const novoItem: ItemOrcamento = {
      id: `item-${Date.now()}`,
      tipoDeChapa: tipoDeChapaInp,
      modoCalculo: modoCalculoInp,

      corChapa: corChapaAcrilicoInp,
      espessuraChapa: espessuraChapaInp,
      larguraChapa: Number(larguraChapaInp),
      alturaChapa: Number(alturaChapaInp),
      profundidadeCaixa: Number(profundidadeChapaInp),
      tipoTampa: tipoTampaCaixaInp,

      tipoPers: tipoPersInp,
      larguraPers: Number(larguraPersInp),
      alturaPers: Number(alturaPersInp),

      quantidade: qtdItemInp,

      areaChapa: calculoAtual.areaChapa,
      areaPers: calculoAtual.areaPers,
      
      valorBaseUnitario: calculoAtual.valorBaseUnitario,
      taxasAplicadas: {
        temImposto: impostoInp, temMaoDeObra: maoDeObraInp, temProjeto: projetoInp, temEspecial: especialInp,
        porcentagemTotal: calculoAtual.porcentagemAcumulada
      },
      valorMaterial: calculoAtual.valorMaterial,
      valorPers: calculoAtual.valorPers,
      valorTotalItem: calculoAtual.valorTotalItem,
      descricaoTexto: calculoAtual.txtItem
    };

    setItens([...itens, novoItem]);
    setQtdItemInp(1);
  };

  const valorTotalOrcamento = useMemo(() => itens.reduce((acc, curr) => acc + curr.valorTotalItem, 0), [itens]);

  return (
    <main>
      {/* Botão do Menu Lateral */}
      <button onClick={() => setIsOpen(!isOpen)} className="fixed top-20 left-3 z-50 p-2 text-white bg-blue-600 rounded-md shadow-md">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      <MenuLateral isOpen={isOpen} />

      <div className="lg:max-w-4/5 mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6 text-gray-800 bg-gray-200 min-h-screen">
        <FormEspecificacoes
          modoCalculo={modoCalculoInp} setModoCalculo={setModoCalculoInp}
          tipoMaterial={tipoDeChapaInp} setTipoMaterial={setTipoDeChapaInp}
          corChapa={corChapaAcrilicoInp} setCorChapa={setCorChapaAcrilicoInp}
          espessuraChapa={espessuraChapaInp} setEspessuraChapa={setEspessuraChapaInp}
          larguraChapa={larguraChapaInp} setLarguraChapa={setLarguraChapaInp}
          alturaChapa={alturaChapaInp} setAlturaChapa={setAlturaChapaInp}
          profundidadeCaixa={profundidadeChapaInp} setProfundidadeCaixa={setProfundidadeChapaInp}
          tipoTampa={tipoTampaCaixaInp} setTipoTampa={setTipoTampaCaixaInp}
          tipoPers={tipoPersInp} setTipoPers={setTipoPersInp}
          larguraPers={larguraPersInp} setLarguraPers={setLarguraPersInp}
          alturaPers={alturaPersInp} setAlturaPers={setAlturaPersInp}
          temImposto={impostoInp} setTemImposto={setImpostoInp}
          temMaoDeObra={maoDeObraInp} setTemMaoDeObra={setMaoDeObraInp}
          temProjeto={projetoInp} setTemProjeto={setProjetoInp}
          temEspecial={especialInp} setTemEspecial={setEspecialInp}
        />

        <ResumoOrcamento
          itens={itens} quantidade={qtdItemInp} setQuantidade={setQtdItemInp}
          calculoAtual={calculoAtual} handleAdicionarItem={handleAdicionarItem}
          handleRemoverItem={(id) => setItens(itens.filter(i => i.id !== id))}
          valorTotalOrcamento={valorTotalOrcamento} handleCopiarOrcamento={() => { }}
          copiado={copiado} abrirModal={(id) => CarregarEdicao(id)}
        />
      </div>
    </main>
  );
}

