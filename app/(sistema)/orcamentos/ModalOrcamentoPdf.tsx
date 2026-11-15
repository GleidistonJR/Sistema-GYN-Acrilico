'use client';

import { useEffect, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { FileDown, X } from 'lucide-react';
import { orcamentoComoImagem } from '@/lib/orcamentoImagem';
import type { ItemOrcamento } from './utils/constants';
import { buscarVendedorPdf } from './actions';
import { formularioInicial, itensParaPdf, totaisOrcamento, validarOrcamentoFormal, type FormularioOrcamento } from '@/lib/orcamentoFormal';

interface Props {
  isOpen: boolean;
  itens: ItemOrcamento[];
  onClose: () => void;
}

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const classeInput = 'mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 p-2.5 outline-none focus:border-amber-400';

export default function ModalOrcamentoPdf({ isOpen, itens, onClose }: Props) {
  const [formulario, setFormulario] = useState<FormularioOrcamento>(formularioInicial);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [imagemPronta, setImagemPronta] = useState<Blob | null>(null);
  const itensPdf = itensParaPdf(itens);
  const totais = totaisOrcamento(itensPdf, formulario.desconto, formulario.frete, formulario.entradaPercentual);

  useEffect(() => { setImagemPronta(null); }, [itens]);

  useEffect(() => {
    if (!isOpen) return;
    let ativo = true;
    buscarVendedorPdf().then(nome => {
      if (ativo) setFormulario(atual => atual.vendedor ? atual : { ...atual, vendedor: nome });
    }).catch(() => { /* The seller can be filled manually; the PDF endpoint also checks the session. */ });
    return () => { ativo = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape' && !gerando) onClose(); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [isOpen, gerando, onClose]);

  function alterar<K extends keyof FormularioOrcamento>(campo: K, valor: FormularioOrcamento[K]) {
    setFormulario(atual => ({ ...atual, [campo]: valor }));
    setMensagem('');
    setImagemPronta(null);
  }

  function baixar(arquivo: Blob, extensao: string) {
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orcamento-${formulario.referencia.replace(/[^a-zA-Z0-9_-]/g, '-')}.${extensao}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function solicitarPdf() {
    const dados = validarOrcamentoFormal({ ...formulario, itens: itensPdf });
    const resposta = await fetch('/api/orcamentos/pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    });
    if (!resposta.ok) {
      const erroResposta = await resposta.json();
      throw new Error(erroResposta.erro || 'Não foi possível gerar o orçamento.');
    }
    return resposta.blob();
  }

  async function copiarImagem() {
    if (gerando) return;
    setGerando(true);
    setErro('');
    setMensagem('Preparando imagem do orçamento...');
    setImagemPronta(null);
    const promessa = solicitarPdf().then(orcamentoComoImagem).then(blob => {
      setImagemPronta(blob);
      return blob;
    });
    // Passing a promise preserves the initial user gesture on browsers that require it.
    const podeCopiar = window.isSecureContext && typeof navigator.clipboard?.write === 'function' && typeof ClipboardItem !== 'undefined';
    try {
      const copia = podeCopiar ? navigator.clipboard.write([new ClipboardItem({ 'image/png': promessa })]) : null;
      if (copia) {
        await copia;
        setMensagem('Imagem copiada! Cole na conversa do WhatsApp com Ctrl+V.');
      } else {
        await promessa;
        setMensagem('Imagem pronta. Este navegador não permite copiar imagens; use Baixar imagem para enviar pelo WhatsApp.');
      }
    } catch {
      try {
        await promessa;
        setMensagem('O navegador bloqueou a cópia. Use Baixar imagem para salvar e enviar pelo WhatsApp.');
      } catch (error) {
        setMensagem('');
        setErro(error instanceof Error ? error.message : 'Não foi possível gerar a imagem.');
      }
    } finally {
      setGerando(false);
    }
  }

  async function gerar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (gerando) return;
    setErro('');
    setMensagem('');
    try {
      setGerando(true);
      baixar(await solicitarPdf(), 'pdf');
      setMensagem('PDF gerado! Confira o arquivo nos downloads do navegador.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-orcamento-pdf" className="modal-panel w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b p-4 sm:px-6">
          <div>
            <h2 id="titulo-orcamento-pdf" className="text-lg font-bold text-[#0A2540]">Orçamento formal em PDF</h2>
            <p className="text-sm text-slate-500">Revise os dados e as condições antes de salvar.</p>
          </div>
          <button type="button" onClick={onClose} disabled={gerando} aria-label="Fechar orçamento em PDF" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
        </div>
        <form onSubmit={gerar} className="p-4 sm:p-6">
          <fieldset disabled={gerando} className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-gyn-acrilico.png" alt="Logo da GYN Acrílico" className="h-20 w-40 object-contain" />
              <div className="text-right"><p className="font-bold text-[#0A2540]">GYN Acrílico</p><p className="text-sm text-slate-500">{itens.length} item(ns) no orçamento</p><p className="text-sm text-slate-500">Telefone / WhatsApp: 62 3945-0198</p></div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Referência do orçamento<input required maxLength={60} value={formulario.referencia} onChange={e => alterar('referencia', e.target.value)} className={classeInput} /></label>
              <label className="block text-sm font-medium text-slate-700">Vendedor<input required maxLength={120} value={formulario.vendedor} onChange={e => alterar('vendedor', e.target.value)} className={classeInput} /></label>
              <label className="block text-sm font-medium text-slate-700">Data de emissão<input required type="date" value={formulario.emissao} onChange={e => alterar('emissao', e.target.value)} className={classeInput} /></label>
              <label className="block text-sm font-medium text-slate-700">Validade (dias)<input required type="number" min="1" max="3650" step="1" value={formulario.validadeDias || ''} onChange={e => alterar('validadeDias', Number(e.target.value))} className={classeInput} /></label>
            </div>
            <section className="space-y-3">
              <h3 className="font-bold text-[#0A2540]">Cliente</h3>
              <label className="block text-sm font-medium text-slate-700">Nome ou razão social<input required maxLength={160} value={formulario.clienteNome} onChange={e => alterar('clienteNome', e.target.value)} className={classeInput} /></label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">CPF/CNPJ do cliente (opcional)<input maxLength={60} value={formulario.clienteDocumento} onChange={e => alterar('clienteDocumento', e.target.value)} className={classeInput} /></label>
                <label className="block text-sm font-medium text-slate-700">Contato do cliente (opcional)<input maxLength={160} value={formulario.clienteContato} onChange={e => alterar('clienteContato', e.target.value)} placeholder="Telefone ou e-mail" className={classeInput} /></label>
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="font-bold text-[#0A2540]">Condições comerciais</h3>
              <label className="block text-sm font-medium text-slate-700">Condições de pagamento<textarea required maxLength={1200} rows={3} value={formulario.pagamento} onChange={e => alterar('pagamento', e.target.value)} className={classeInput} /></label>
              <label className="block text-sm font-medium text-slate-700">Prazo de produção<textarea required maxLength={800} rows={2} value={formulario.prazo} onChange={e => alterar('prazo', e.target.value)} className={classeInput} /></label>
              <label className="block text-sm font-medium text-slate-700">Retirada / entrega<textarea required maxLength={800} rows={2} value={formulario.entrega} onChange={e => alterar('entrega', e.target.value)} className={classeInput} /></label>
              <label className="block text-sm font-medium text-slate-700">Observações (opcional)<textarea maxLength={2400} rows={3} value={formulario.observacoes} onChange={e => alterar('observacoes', e.target.value)} className={classeInput} /></label>
            </section>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">Desconto<NumericFormat value={formulario.desconto} onValueChange={v => alterar('desconto', v.floatValue ?? 0)} decimalSeparator="," thousandSeparator="." decimalScale={2} fixedDecimalScale prefix="R$ " allowNegative={false} inputMode="decimal" className={classeInput} /></label>
              <label className="block text-sm font-medium text-slate-700">Frete / entrega<NumericFormat value={formulario.frete} onValueChange={v => alterar('frete', v.floatValue ?? 0)} decimalSeparator="," thousandSeparator="." decimalScale={2} fixedDecimalScale prefix="R$ " allowNegative={false} inputMode="decimal" className={classeInput} /></label>
              <label className="block text-sm font-medium text-slate-700">Entrada (%)<input type="number" min="0" max="100" step="0.01" value={formulario.entradaPercentual} onChange={e => alterar('entradaPercentual', Number(e.target.value))} className={classeInput} /></label>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <p className="flex flex-wrap justify-between gap-2"><span>Subtotal dos itens</span><strong>{moeda(totais.subtotal)}</strong></p>
              <p className="flex flex-wrap justify-between gap-2 text-emerald-700"><span>Desconto</span><span>- {moeda(formulario.desconto)}</span></p>
              <p className="flex flex-wrap justify-between gap-2"><span>Frete / entrega</span><span>{moeda(formulario.frete)}</span></p>
              <p className="flex flex-wrap justify-between gap-2 border-t pt-2 text-lg font-bold text-[#0A2540]"><span>Total do orçamento</span><span>{moeda(totais.total)}</span></p>
              <p className="flex flex-wrap justify-between gap-2"><span>Entrada ({formulario.entradaPercentual}%)</span><strong>{moeda(totais.entrada)}</strong></p>
              <p className="flex flex-wrap justify-between gap-2"><span>Saldo na retirada</span><strong>{moeda(totais.saldo)}</strong></p>
            </div>
            {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
            {mensagem && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensagem}</p>}
            <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
              <button type="button" onClick={onClose} className="min-h-11 rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-600">Fechar</button>
              <button type="button" onClick={copiarImagem} disabled={itens.length === 0} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:opacity-50">Copiar imagem</button>
              {imagemPronta && <button type="button" onClick={() => baixar(imagemPronta, 'png')} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">Baixar imagem</button>}
              <button type="submit" disabled={itens.length === 0} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0A2540] px-4 py-2 font-semibold text-white hover:bg-[#0f3a6b] disabled:opacity-50"><FileDown size={18} />{gerando ? 'Processando...' : 'Baixar PDF'}</button>
            </div>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
