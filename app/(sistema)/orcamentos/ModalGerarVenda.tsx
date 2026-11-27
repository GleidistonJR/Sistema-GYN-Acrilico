'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { itensParaPdf } from '@/lib/orcamentoFormal';
import { validarVenda } from '@/lib/integracoes/dadosVenda';
import { mascararTelefone } from '@/lib/atendimento/regras';
import type { ItemOrcamento } from './utils/constants';

type Forma = { id: number; descricao: string };
type ItemVenda = { sku: string; descricao: string; quantidade: number; valorUnitario: number };
type Parcela = { chave: number; forma: number; vencimento: string; valor: number };
type Resultado = { erro?: string; numero?: string; referencia?: string; trelloUrl?: string; podeEditar?: boolean };
type Pendente = { id: string; blingNumero?: string; criadoEm: string };
type Produto = { codigo: string; nome: string };
const campo = 'min-h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface-soft px-3 py-2 text-sm';
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const centavos = (valor: number) => Math.round(valor * 100);
const hoje = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

function SelecionarMaterial({ sku, alterar }: { sku: string; alterar: (sku: string) => void }) {
  const [termo, setTermo] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [mensagem, setMensagem] = useState('');
  const [buscando, setBuscando] = useState(false);

  async function buscar() {
    setBuscando(true);
    setMensagem('');
    setProdutos([]);
    try {
      const resposta = await fetch('/api/orcamentos/venda?' + new URLSearchParams({ material: termo.trim() }));
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      setProdutos(dados.produtos);
      if (!dados.produtos.length) setMensagem('Nenhum produto ativo encontrado.');
    } catch {
      setMensagem('Não foi possível buscar os materiais do Bling.');
    } finally {
      setBuscando(false);
    }
  }

  return <div className="col-span-full space-y-2">
    <label className="grid gap-1 text-sm">SKU do material no Bling<input className={campo} value={sku} onChange={e => alterar(e.target.value)} maxLength={60} required /></label>
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid min-w-36 flex-1 gap-1 text-sm">Buscar material pelo nome<input className={campo} value={termo} onChange={e => setTermo(e.target.value)} maxLength={100}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!buscando && termo.trim().length >= 3) void buscar(); } }} /></label>
      <button type="button" onClick={buscar} disabled={buscando || termo.trim().length < 3} className="min-h-10 rounded-lg border border-line px-3 text-sm font-semibold disabled:opacity-50">{buscando ? 'Buscando…' : 'Buscar'}</button>
    </div>
    {mensagem && <p role="status" className="text-xs text-muted">{mensagem}</p>}
    {produtos.length > 0 && <label className="grid gap-1 text-sm">Resultados do Bling
      <select className={campo} value={produtos.some(p => p.codigo === sku) ? sku : ''} onChange={e => alterar(e.target.value)}>
        <option value="">Selecione o material</option>
        {produtos.map((produto, i) => <option key={produto.codigo + ':' + i} value={produto.codigo}>{produto.nome} · {produto.codigo}</option>)}
      </select>
    </label>}
  </div>;
}

export default function ModalGerarVenda({ itens, aberto, fechar, novaVenda, cliente }: {
  itens: ItemOrcamento[];
  aberto: boolean;
  fechar: (preservar: boolean) => void;
  novaVenda?: () => void;
  cliente: { clienteNome: string; clienteDocumento: string; clienteContato: string };
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const bloqueio = useRef(false);
  const chaveParcela = useRef(0);
  const [formas, setFormas] = useState<Forma[]>([]);
  const [erroConexao, setErroConexao] = useState('');
  const [nome, setNome] = useState(cliente.clienteNome);
  const [documento, setDocumento] = useState(cliente.clienteDocumento);
  const [telefone, setTelefone] = useState(() => /^[+\d\s().-]+$/.test(cliente.clienteContato) ? mascararTelefone(cliente.clienteContato) : '');
  const [linhas, setLinhas] = useState<ItemVenda[]>(() => itensParaPdf(itens).map((item, index) => ({
    ...item, sku: '', descricao: [item.descricao, ...itens[index].descricaoTexto.split('\n').slice(1)].join('\n'),
    valorUnitario: centavos(item.valorUnitario) / 100,
  })));
  const total = linhas.reduce((soma, linha) => soma + centavos(linha.valorUnitario) * linha.quantidade, 0);
  const [parcelas, setParcelas] = useState<Parcela[]>(() => [{ chave: 0, forma: 0, vencimento: hoje(), valor: total / 100 }]);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado>({});
  const [tentativa, setTentativa] = useState<string>();
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [retomada, setRetomada] = useState(false);
  const bloqueado = !!tentativa || enviando;
  const fecharModal = () => fechar(!!tentativa);
  const totalParcelas = parcelas.reduce((soma, parcela) => soma + centavos(parcela.valor), 0);

  useEffect(() => {
    if (aberto && !modal.current?.open) modal.current?.showModal();
    if (!aberto && modal.current?.open) modal.current.close();
    if (!aberto) return;
    const controller = new AbortController();
    fetch('/api/orcamentos/venda', { signal: controller.signal })
      .then(async resposta => {
        const dados = await resposta.json();
        setFormas(dados.formas ?? []);
        setPendentes(dados.pendentes ?? []);
        setErroConexao(resposta.ok ? '' : dados.erro);
      })
      .catch(() => {
        if (!controller.signal.aborted) setErroConexao('Não foi possível consultar a integração. Reabra a janela para tentar novamente.');
      });
    return () => controller.abort();
  }, [aberto]);

  function atualizarLinha(indice: number, mudanca: Partial<ItemVenda>) {
    const atualizadas = linhas.map((linha, i) => i === indice ? { ...linha, ...mudanca } : linha);
    setLinhas(atualizadas);
    if (parcelas.length === 1) {
      const novoTotal = atualizadas.reduce((soma, linha) => soma + centavos(linha.valorUnitario) * linha.quantidade, 0);
      setParcelas(atuais => atuais.map(parcela => ({ ...parcela, valor: novoTotal / 100 })));
    }
  }

  function atualizarParcela(chave: number, mudanca: Partial<Parcela>) {
    setParcelas(atuais => atuais.map(parcela => parcela.chave === chave ? { ...parcela, ...mudanca } : parcela));
  }

  async function oferecerEnvio(dados: object, id: string) {
    if (bloqueio.current || resultado.trelloUrl) return;
    bloqueio.current = true;
    setEnviando(true);
    setTentativa(id);
    setResultado(atual => ({ ...atual, erro: undefined }));
    try {
      const resposta = await fetch('/api/orcamentos/venda', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
      });
      const resultado: Resultado = await resposta.json();
      setResultado(atual => ({ ...atual, ...resultado, referencia: resultado.referencia ?? 'GYN-' + id }));
      if (resultado.trelloUrl || resultado.podeEditar || resposta.status === 400) setPendentes(atuais => atuais.filter(p => p.id !== id));
      if (resultado.podeEditar || resposta.status === 400) {
        setTentativa(undefined);
        setRetomada(false);
      }
    } catch {
      setResultado(atual => ({ ...atual, referencia: 'GYN-' + id, erro: 'O envio ainda não foi confirmado. Consulte a mesma tentativa.' }));
    } finally {
      bloqueio.current = false;
      setEnviando(false);
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (tentativa && retomada) return oferecerEnvio({ retomar: tentativa }, tentativa);
    const id = tentativa ?? crypto.randomUUID();
    const dados = { id, nome, documento, telefone, itens: linhas, parcelas };
    try {
      validarVenda(dados);
    } catch (erro) {
      setResultado({ erro: erro instanceof Error ? erro.message : 'Confira os dados da venda.' });
      return;
    }
    return oferecerEnvio(dados, id);
  }

  return (
    <dialog ref={modal} aria-labelledby="titulo-gerar-venda"
      onCancel={evento => { evento.preventDefault(); if (!enviando) fecharModal(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface text-foreground shadow-2xl backdrop:bg-black/55">
      <form onSubmit={enviar}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4">
          <div>
            <h2 id="titulo-gerar-venda" className="text-xl font-bold">Gerar venda</h2>
            <p className="mt-1 text-sm text-muted">Pedido no Bling e cartão de produção no Trello.</p>
          </div>
          <button type="button" aria-label="Fechar venda" disabled={enviando} onClick={fecharModal} className="rounded-lg p-2 hover:bg-surface-hover disabled:opacity-50"><X size={20} /></button>
        </header>
        <div className="space-y-5 p-5">
          {erroConexao && !tentativa && <p role="status" className="rounded-lg bg-warning-soft p-3 text-sm text-warning-ink">{erroConexao}</p>}
          {!tentativa && pendentes.length > 0 && <section className="space-y-2 rounded-xl border border-warning-line bg-warning-soft p-3">
            <h3 className="font-semibold text-warning-ink">Envios pendentes</h3>
            {pendentes.map(p => <button type="button" key={p.id} onClick={() => {
              setRetomada(true);
              void oferecerEnvio({ retomar: p.id }, p.id);
            }} className="block w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm font-semibold hover:bg-surface-hover">
              {p.blingNumero ? `Pedido ${p.blingNumero}` : `Tentativa ${p.id.slice(0, 8)}`} · {dataHora.format(new Date(p.criadoEm))} · Retomar
            </button>)}
          </section>}
          {linhas.length === 0 && !pendentes.length && !tentativa && !erroConexao && <p className="text-sm text-muted">Adicione itens ao orçamento para gerar uma venda.</p>}
          {linhas.length > 0 && !retomada && <>
          <fieldset disabled={bloqueado} className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">Cliente</legend>
            <label className="grid gap-1 text-sm sm:col-span-2">Nome ou razão social<input className={campo} value={nome} onChange={e => setNome(e.target.value)} maxLength={120} autoComplete="off" required /></label>
            <label className="grid gap-1 text-sm">CPF ou CNPJ<input className={campo} value={documento} onChange={e => setDocumento(e.target.value)} maxLength={24} autoComplete="off" required /></label>
            <label className="grid gap-1 text-sm">Telefone com DDD<input className={campo} value={telefone} onChange={e => setTelefone(mascararTelefone(e.target.value))} type="tel" autoComplete="off" required /></label>
          </fieldset>

          <fieldset disabled={bloqueado} className="space-y-3">
            <legend className="mb-2 font-semibold">Materiais e detalhes</legend>
            {linhas.map((item, indice) => (
              <div key={itens[indice].id} className="grid grid-cols-2 gap-3 rounded-xl border border-line p-3 sm:grid-cols-[2fr_1fr_1fr]">
                <SelecionarMaterial sku={item.sku} alterar={sku => atualizarLinha(indice, { sku })} />
                <label className="grid gap-1 text-sm">Quantidade<input className={campo} type="number" min="1" max="100000" step="1" value={item.quantidade} onChange={e => atualizarLinha(indice, { quantidade: Number(e.target.value) })} required /></label>
                <label className="grid gap-1 text-sm">Valor unitário (R$)<input className={campo} type="number" min="0" step="0.01" value={item.valorUnitario} onChange={e => atualizarLinha(indice, { valorUnitario: Number(e.target.value) })} required /></label>
                <label className="col-span-full grid gap-1 text-sm">Descrição para produção<textarea className={campo} rows={3} maxLength={2000} value={item.descricao} onChange={e => atualizarLinha(indice, { descricao: e.target.value })} required /></label>
              </div>
            ))}
          </fieldset>

          <fieldset disabled={bloqueado} className="space-y-3">
            <legend className="mb-2 font-semibold">Pagamentos</legend>
            {parcelas.map(parcela => (
              <div key={parcela.chave} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[2fr_1.3fr_1fr_auto]">
                <label className="col-span-2 grid gap-1 text-sm sm:col-span-1">Forma<select className={campo} required value={parcela.forma || ''} onChange={e => atualizarParcela(parcela.chave, { forma: Number(e.target.value) })}>
                  <option value="">Selecione</option>
                  {formas.map(forma => <option key={forma.id} value={forma.id}>{forma.descricao}</option>)}
                </select></label>
                <label className="grid gap-1 text-sm">Vencimento<input className={campo} type="date" required value={parcela.vencimento} onChange={e => atualizarParcela(parcela.chave, { vencimento: e.target.value })} /></label>
                <label className="grid gap-1 text-sm">Valor (R$)<input className={campo} type="number" step="0.01" min="0.01" required value={parcela.valor} onChange={e => atualizarParcela(parcela.chave, { valor: Number(e.target.value) })} /></label>
                {parcelas.length > 1 && <button type="button" aria-label="Remover parcela" onClick={() => setParcelas(atuais => atuais.filter(item => item.chave !== parcela.chave))} className="justify-self-start rounded-lg p-2.5 text-danger-ink hover:bg-danger-soft"><Trash2 size={18} /></button>}
              </div>
            ))}
            <button type="button" disabled={parcelas.length >= 12} onClick={() => {
              const chave = ++chaveParcela.current;
              setParcelas(atuais => [...atuais, { chave, vencimento: hoje(), forma: 0, valor: Math.max(0, (total - totalParcelas) / 100) }]);
            }} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-primary-ink hover:bg-surface-hover disabled:opacity-50"><Plus size={16} />Adicionar pagamento</button>
          </fieldset>

          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-surface-muted px-4 py-3">
            <p className={`text-sm ${totalParcelas !== total ? 'text-warning-ink' : 'text-muted'}`}>Pagamentos {moeda.format(totalParcelas / 100)}</p>
            <p className="font-bold">Total {moeda.format(total / 100)}</p>
          </div>
          </>}
          <div aria-live="polite" className="space-y-2 text-sm">
            {resultado.numero && <p className="font-semibold text-success-ink">Pedido {resultado.numero} criado no Bling.</p>}
            {resultado.trelloUrl && <a href={resultado.trelloUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary-ink underline">Abrir cartão no Trello</a>}
            {resultado.erro && <p className="text-danger-ink">{resultado.erro}</p>}
            {resultado.referencia && !resultado.trelloUrl && <p className="break-all text-xs text-muted">Referência para conferência no Bling {resultado.referencia}</p>}
          </div>
        </div>
        <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-5 py-4">
          <button type="button" onClick={fecharModal} disabled={enviando} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50">Fechar</button>
          {resultado.trelloUrl && novaVenda && <button type="button" onClick={novaVenda} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">Preparar outra venda</button>}
          {!resultado.trelloUrl && (linhas.length > 0 || tentativa) && <button type="submit" disabled={enviando || (!tentativa && (!formas.length || totalParcelas !== total || total <= 0))}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
            {enviando ? 'Enviando…' : tentativa ? 'Consultar e continuar' : 'Confirmar venda'}
          </button>}
        </footer>
      </form>
    </dialog>
  );
}
