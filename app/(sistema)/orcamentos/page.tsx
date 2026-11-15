"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useDadosAtualizados } from '@/lib/useDadosAtualizados';
import { ItemOrcamento } from './utils/constants';
import MenuLateral from './MenuLateral';
import FormEspecificacoes from './FormEspecificacoes';
import ResumoOrcamento from './ResumoOrcamento';
import { calcularOrcamentoItem, ResultadoCalculo } from './utils/calculos';
import ModalItemPersonalizado from './ModalItemPersonalizado';
import { criarItemPersonalizado } from './utils/itemPersonalizado';
import ModalOrcamentoPdf from './ModalOrcamentoPdf';
import { renomearItem } from './utils/nomeItem';

export default function CalculadorChapa() {
  // 1. Estados de Controle de Interface
  const [isOpen, setIsOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // 2. Estados do Formulário de Especificações
  const [modoCalculoInp, setModoCalculoInp] = useState('corte');
  const [tipoDeChapaInp, setTipoDeChapaInp] = useState('Acrílico');
  const [corChapaAcrilicoInp, setCorChapaAcrilicoInp] = useState('Cristal');
  const [espessuraChapaInp, setEspessuraChapaInp] = useState('2');

  const [comprimentoInp, setComprimentoInp] = useState('0');
  const [larguraInp, setLarguraInp] = useState('0');
  const [profundidadeInp, setProfundidadeInp] = useState('0');

  const [tipoTampaCaixaInp, setTipoTampaCaixaInp] = useState('semTampa');
  const [qtdItemInp, setQtdItemInp] = useState(1);

  // Item escolhido diretamente pelo nome (ex.: categoria "Personalização")
  const [materialId, setMaterialId] = useState('');

  // 3. Estados das Taxas
  const [impostoInp, setImpostoInp] = useState(true);
  const [maoDeObraInp, setMaoDeObraInp] = useState(true);
  const [projetoInp, setProjetoInp] = useState(true);
  const [especialInp, setEspecialInp] = useState(false);

  // Os itens já adicionados são preservados como o orçamento montado pelo usuário.
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null);
  const [personalizadoAberto, setPersonalizadoAberto] = useState(false);
  const [personalizadoEditando, setPersonalizadoEditando] = useState<ItemOrcamento | null>(null);
  const [pdfAberto, setPdfAberto] = useState(false);

  function salvarPersonalizado(titulo: string, valor: number, quantidade: number) {
    const id = personalizadoEditando?.id ?? globalThis.crypto?.randomUUID?.()
      ?? `personalizado-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const item = criarItemPersonalizado(titulo, valor, id, quantidade);
    setItens(atuais => personalizadoEditando
      ? atuais.map(atual => atual.id === item.id ? item : atual)
      : [...atuais, item]);
    setPersonalizadoAberto(false);
    setPersonalizadoEditando(null);
  }

  // Somente a prévia do próximo item consulta os preços atuais.
  const parametrosCalculo = useMemo(() => ({
    modoCalculo: modoCalculoInp,
    tipoMaterial: tipoDeChapaInp,
    corChapa: corChapaAcrilicoInp,
    espessuraChapa: espessuraChapaInp,
    comprimentoInp,
    larguraInp,
    profundidadeInp,
    tipoTampaCaixaInp,
    quantidade: qtdItemInp,
    materialId,
    temImposto: impostoInp,
    temMaoDeObra: maoDeObraInp,
    temProjeto: projetoInp,
    temEspecial: especialInp,
  }), [modoCalculoInp, tipoDeChapaInp, corChapaAcrilicoInp, espessuraChapaInp,
    comprimentoInp, larguraInp, profundidadeInp, tipoTampaCaixaInp, qtdItemInp,
    materialId, impostoInp, maoDeObraInp, projetoInp, especialInp]);

  const chaveCalculo = JSON.stringify(parametrosCalculo);
  const buscarCalculo = useCallback(async () => ({
    ...await calcularOrcamentoItem(parametrosCalculo),
    chave: JSON.stringify(parametrosCalculo),
  }), [parametrosCalculo]);
  const { dados: calculoAtual, erro: erroCalculo } = useDadosAtualizados<ResultadoCalculo & { chave: string }>(buscarCalculo, {
    areaChapa: 0,
    valorBaseUnitario: 0,
    valorMaterial: 0,
    valorTotalItem: 0,
    minutosCorte: 0,
    segundosCorte: 0,
    porcentagemAcumulada: 0,
    txtItem: '',
    chave: '',
  });
  const calculoPendente = calculoAtual.chave !== chaveCalculo;

  const handleCopiarOrcamento = () => {
    const textoFinal = `*ORÇAMENTO GOIÂNIA ACRÍLICO*\n-------------------------------------\n${itens.map(i => i.descricaoTexto).join('\n\n')}\n-------------------------------------\n*TOTAL: R$ ${valorTotalOrcamento.toFixed(2)}*\n\n*ENTRADA: R$ ${(valorTotalOrcamento / 2).toFixed(2)}*\n\nTempo médio para ser produzido de *7 dias úteis após aprovação do projeto*.\nPara início da produção é solicitado 50% do valor antecipado e o restante no ato da retirada.\nForma de pagamento: Dinheiro, PIX ou cartão de crédito em 2x, e débito.\nRetirar na loja, não estamos fazendo entrega.`;
    navigator.clipboard.writeText(textoFinal).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  function CarregarEdicao(id: string) {
    const itemModificando = itens.find(item => item.id === id);
    if (itemModificando?.modoCalculo === 'custom') {
      setPersonalizadoEditando(itemModificando);
      setPersonalizadoAberto(true);
      return;
    }

    if (itemModificando) {
      setItemEditandoId(id);
      setModoCalculoInp(String(itemModificando.modoCalculo));
      setTipoDeChapaInp(String(itemModificando.tipoDeChapa));
      setCorChapaAcrilicoInp(String(itemModificando.corChapa));
      setEspessuraChapaInp(String(itemModificando.espessuraChapa));
      setComprimentoInp(String(itemModificando.larguraChapa));
      setLarguraInp(String(itemModificando.alturaChapa));
      setProfundidadeInp(String(itemModificando.profundidadeCaixa));
      setTipoTampaCaixaInp(String(itemModificando.tipoTampa));
      setQtdItemInp(itemModificando.quantidade);
      setMaterialId(itemModificando.materialId ?? '');

      setImpostoInp(itemModificando.taxasAplicadas.temImposto);
      setMaoDeObraInp(itemModificando.taxasAplicadas.temMaoDeObra);
      setProjetoInp(itemModificando.taxasAplicadas.temProjeto);
      setEspecialInp(itemModificando.taxasAplicadas.temEspecial);
    }
  }

  // Ações da Aplicação
  const handleAdicionarItem = () => {
    if (tipoDeChapaInp === 'Personalização' && !materialId) {
      return alert("Selecione o tipo de personalização!");
    }

    const medidas = [Number(comprimentoInp), Number(larguraInp), ...(modoCalculoInp === 'caixa' ? [Number(profundidadeInp)] : [])];
    if ((modoCalculoInp !== 'chapa' && !medidas.every(n => Number.isFinite(n) && n > 0)) || corChapaAcrilicoInp === '') {
      return alert(modoCalculoInp === 'caixa' ? 'Informe comprimento, largura e altura maiores que zero e selecione a cor.' : 'Preencha todos os campos!');
    }
    if (calculoPendente || erroCalculo) return alert('Aguarde o cálculo atualizado antes de salvar o item.');

    const novoItem: ItemOrcamento = {
      id: itemEditandoId ?? `item-${Date.now()}`,
      tipoDeChapa: tipoDeChapaInp,
      modoCalculo: modoCalculoInp,
      corChapa: corChapaAcrilicoInp,
      espessuraChapa: espessuraChapaInp,
      larguraChapa: Number(comprimentoInp),
      alturaChapa: Number(larguraInp),
      profundidadeCaixa: Number(profundidadeInp),
      tipoTampa: tipoTampaCaixaInp,
      materialId,

      quantidade: qtdItemInp,

      areaChapa: calculoAtual.areaChapa,

      valorBaseUnitario: calculoAtual.valorBaseUnitario,
      taxasAplicadas: {
        temImposto: impostoInp,
        temMaoDeObra: maoDeObraInp,
        temProjeto: projetoInp,
        temEspecial: especialInp,
        porcentagemTotal: calculoAtual.porcentagemAcumulada
      },
      valorMaterial: calculoAtual.valorMaterial,
      valorTotalItem: calculoAtual.valorTotalItem,
      descricaoTexto: calculoAtual.txtItem
    };

    setItens(atuais => itemEditandoId
      ? atuais.map(item => item.id === itemEditandoId ? novoItem : item)
      : [...atuais, novoItem]);
    setItemEditandoId(null);
    setQtdItemInp(1);
  };

  const valorTotalOrcamento = itens.reduce((acc, curr) => acc + curr.valorTotalItem, 0);

  return (
    <>
      {/* Botão do Menu Lateral */}
      <button onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Fechar textos rápidos" : "Abrir textos rápidos"} aria-expanded={isOpen} className="fixed top-20 left-3 z-[45] min-w-11 min-h-11 p-2 text-white bg-[#0a2540] hover:bg-[#0f3a6b] hover:cursor-pointer rounded-md shadow-md">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {isOpen && <button type="button" aria-label="Fechar textos rápidos" onClick={() => setIsOpen(false)} className="fixed inset-0 top-16 z-30 bg-black/30" />}
      <MenuLateral isOpen={isOpen} />

      <div className='bg-gray-200'>
        <div className="w-full lg:max-w-5/6 mx-auto px-3 pt-18 pb-6 sm:px-6 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 text-gray-800 min-h-screen">
          <FormEspecificacoes
            modoCalculo={modoCalculoInp} setModoCalculo={setModoCalculoInp}
            tipoMaterial={tipoDeChapaInp} setTipoMaterial={setTipoDeChapaInp}
            corChapa={corChapaAcrilicoInp} setCorChapa={setCorChapaAcrilicoInp}
            espessuraChapa={espessuraChapaInp} setEspessuraChapa={setEspessuraChapaInp}

            comprimentoInp={comprimentoInp} setComprimentoInp={setComprimentoInp}
            larguraInp={larguraInp} setLarguraInp={setLarguraInp}
            profundidadeInp={profundidadeInp} setProfundidadeInp={setProfundidadeInp}

            tipoTampa={tipoTampaCaixaInp} setTipoTampa={setTipoTampaCaixaInp}

            materialId={materialId} setMaterialId={setMaterialId}

            temImposto={impostoInp} setTemImposto={setImpostoInp}
            temMaoDeObra={maoDeObraInp} setTemMaoDeObra={setMaoDeObraInp}
            temProjeto={projetoInp} setTemProjeto={setProjetoInp}
            temEspecial={especialInp} setTemEspecial={setEspecialInp}
          />

          <ResumoOrcamento
            itens={itens} quantidade={qtdItemInp} setQuantidade={setQtdItemInp}
            calculoAtual={calculoAtual} handleAdicionarItem={handleAdicionarItem}
            calculoPendente={calculoPendente}
            erroCalculo={Boolean(erroCalculo)}
            itemEditandoId={itemEditandoId}
            cancelarEdicao={() => setItemEditandoId(null)}
            handleRemoverItem={(id) => {
              setItens(atuais => atuais.filter(i => i.id !== id));
              if (itemEditandoId === id) setItemEditandoId(null);
            }}
            valorTotalOrcamento={valorTotalOrcamento} handleCopiarOrcamento={handleCopiarOrcamento}
            copiado={copiado} abrirModal={(id) => CarregarEdicao(id)}
            abrirPersonalizado={() => { setPersonalizadoEditando(null); setPersonalizadoAberto(true); }}
            abrirPdf={() => setPdfAberto(true)}
            renomear={(id, nome) => {
              setItens(atuais => atuais.map(item => item.id === id ? renomearItem(item, nome) : item));
              setCopiado(false);
            }}
          />
        </div>
      </div>
      {personalizadoAberto && <ModalItemPersonalizado
        item={personalizadoEditando}
        onClose={() => { setPersonalizadoAberto(false); setPersonalizadoEditando(null); }}
        onSalvar={salvarPersonalizado}
      />}
      <ModalOrcamentoPdf isOpen={pdfAberto} itens={itens} onClose={() => setPdfAberto(false)} />
    </>
  );
}
