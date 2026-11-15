import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { totaisOrcamento, type OrcamentoFormal } from './orcamentoFormal';

const A4 = { largura: 595.28, altura: 841.89, margem: 42, rodape: 792 };
const destaque = rgb(0.20, 0.20, 0.20), borda = rgb(0.70, 0.70, 0.70);
const ink = rgb(0.20, 0.20, 0.20), muted = rgb(0.40, 0.40, 0.40), light = rgb(0.91, 0.91, 0.91);
const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (valor: string) => valor.split('-').reverse().join('/');

export async function gerarOrcamentoPdf(dados: OrcamentoFormal, logo: Uint8Array) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Orçamento ${dados.referencia} - GYN Acrílico`);
  pdf.setAuthor('GYN Acrílico');
  pdf.setSubject(`Orçamento para ${dados.clienteNome}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const marca = await pdf.embedPng(logo);
  const caracteres = new Set(regular.getCharacterSet());
  const largura = A4.largura - A4.margem * 2;
  let pagina!: PDFPage;
  let y = 0;

  function limpar(valor: string) {
    return [...valor.normalize('NFC').replace(/[\u2010-\u2015]/g, '-').replace(/\t/g, ' ')]
      .map(char => char === '\n' || caracteres.has(char.codePointAt(0)!) ? char : '?').join('');
  }
  function linhas(texto: string, max: number, tamanho = 10, fonte = regular) {
    const saida: string[] = [];
    for (const paragrafo of limpar(texto).split('\n')) {
      let linha = '';
      for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
        if (fonte.widthOfTextAtSize([linha, palavra].filter(Boolean).join(' '), tamanho) <= max) {
          linha = [linha, palavra].filter(Boolean).join(' ');
          continue;
        }
        if (linha) { saida.push(linha); linha = ''; }
        for (const letra of palavra) {
          if (linha && fonte.widthOfTextAtSize(linha + letra, tamanho) > max) { saida.push(linha); linha = ''; }
          linha += letra;
        }
      }
      saida.push(linha);
    }
    return saida;
  }
  function texto(valor: string, x: number, topo: number, tamanho = 10, fonte: PDFFont = regular, cor = ink) {
    pagina.drawText(limpar(valor), { x, y: A4.altura - topo - tamanho, size: tamanho, font: fonte, color: cor });
  }
  function direita(valor: string, x: number, topo: number, tamanho = 9.3, fonte = regular, cor = ink, max = 95) {
    const escrito = limpar(valor);
    while (fonte.widthOfTextAtSize(escrito, tamanho) > max && tamanho > 4) tamanho -= 0.25;
    texto(escrito, x - fonte.widthOfTextAtSize(escrito, tamanho), topo, tamanho, fonte, cor);
  }
  function caixa(x: number, topo: number, w: number, h: number, cor = light) {
    pagina.drawRectangle({ x, y: A4.altura - topo - h, width: w, height: h, color: cor });
  }
  function linha(topo: number, cor = light) {
    pagina.drawLine({ start: { x: A4.margem, y: A4.altura - topo }, end: { x: A4.largura - A4.margem, y: A4.altura - topo }, thickness: 0.7, color: cor });
  }
  function novaPagina(primeira = false) {
    pagina = pdf.addPage([A4.largura, A4.altura]);
    const dimensoes = marca.scaleToFit(primeira ? 142 : 78, primeira ? 62 : 40);
    pagina.drawImage(marca, { x: A4.margem, y: A4.altura - 30 - dimensoes.height, width: dimensoes.width, height: dimensoes.height });
    if (primeira) {
      texto('GOIANIA ACRILICO LTDA', A4.margem, 97, 10, bold, destaque);
      const empresa = [dados.empresaCnpj ? `CNPJ: ${dados.empresaCnpj}` : '', dados.empresaEndereco, dados.empresaContato].filter(Boolean);
      let topoEmpresa = 113;
      for (const campo of empresa) for (const trecho of linhas(campo, 285, 8)) { texto(trecho, A4.margem, topoEmpresa, 8, regular, muted); topoEmpresa += 11; }
      texto('ORÇAMENTO', 352, 35, 16, bold, destaque);
      for (const [i, trecho] of linhas(dados.referencia, 200, 9, bold).entries()) texto(trecho, 352, 66 + i * 12, 9, bold, destaque);
      texto(`Emissão: ${dataBr(dados.emissao)}`, 352, 105, 9, regular, muted);
      texto(`Validade: ${dados.validadeDias} ${dados.validadeDias === 1 ? 'dia' : 'dias'}`, 352, 122, 9, bold, destaque);
      y = Math.max(158, topoEmpresa + 10);
      linha(y, borda);
      y += 16;
      const inicio = y;
      texto('CLIENTE', A4.margem, y, 8, bold, muted);
      texto('VENDEDOR RESPONSÁVEL', 365, y, 8, bold, muted);
      y += 16;
      for (const campo of [dados.clienteNome, dados.clienteDocumento ? `CPF/CNPJ: ${dados.clienteDocumento}` : '', dados.clienteContato].filter(Boolean)) {
        for (const trecho of linhas(campo, 295, 10)) { texto(trecho, A4.margem, y, 10, campo === dados.clienteNome ? bold : regular); y += 14; }
      }
      let vendedorY = inicio + 16;
      for (const trecho of linhas(dados.vendedor, 188, 10, bold)) { texto(trecho, 365, vendedorY, 10, bold); vendedorY += 14; }
      y = Math.max(y, vendedorY) + 20;
    } else {
      texto('GOIANIA ACRILICO LTDA', 140, 33, 10, bold, destaque);
      direita(`Orçamento ${dados.referencia}`, A4.largura - A4.margem, 37, 8, regular, muted, 235);
      linha(84, borda);
      y = 100;
    }
  }
  function cabecalhoTabela() {
    caixa(A4.margem, y, largura, 25, light);
    texto('#', 48, y + 7, 8.5, bold, ink);
    texto('DESCRIÇÃO', 70, y + 7, 8.5, bold, ink);
    direita('QTD.', 359, y + 7, 8, bold, ink, 37);
    direita('UNITÁRIO', 445, y + 7, 8, bold, ink, 76);
    direita('TOTAL', 547, y + 7, 8, bold, ink, 94);
    y += 25;
  }
  function espaco(altura: number, tabela = false) {
    if (y + altura <= A4.rodape - 10) return;
    novaPagina();
    if (tabela) cabecalhoTabela();
  }

  novaPagina(true);
  cabecalhoTabela();
  for (const [indice, item] of dados.itens.entries()) {
    const descricao = linhas(item.descricao, 241, 9.5);
    const altura = Math.max(34, descricao.length * 13 + 14);
    espaco(altura, true);
    if (indice % 2 === 0) caixa(A4.margem, y, largura, altura, rgb(0.975, 0.975, 0.975));
    texto(String(indice + 1).padStart(2, '0'), 48, y + 10, 8, regular, muted);
    descricao.forEach((trecho, i) => texto(trecho, 70, y + 9 + i * 13, 9.5));
    direita(item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 6 }), 359, y + 10, 9.3, regular, ink, 35);
    direita(moeda(item.valorUnitario), 445, y + 10, 9.3, regular, ink, 76);
    const totalItem = Math.round(Math.round(item.valorUnitario * 100) * item.quantidade) / 100;
    direita(moeda(totalItem), 547, y + 10, 9.3, bold, destaque, 94);
    y += altura;
    linha(y);
  }

  const totais = totaisOrcamento(dados.itens, dados.desconto, dados.frete, dados.entradaPercentual);
  y += 16;
  espaco(160);
  const xTotal = 313, wTotal = 240;
  for (const [nome, valor] of [['Subtotal dos itens', totais.subtotal], ['Desconto', totais.desconto ? -totais.desconto : 0], ['Frete / entrega', totais.frete]] as const) {
    texto(nome, xTotal + 12, y, 9, regular, muted);
    direita(moeda(valor), xTotal + wTotal - 12, y, 9, regular, ink, 115);
    y += 18;
  }
  caixa(xTotal, y, wTotal, 30, light);
  texto('TOTAL', xTotal + 12, y + 9, 9, bold, ink);
  direita(moeda(totais.total), xTotal + wTotal - 12, y + 8, 11, bold, ink, 160);
  y += 40;
  texto(`Entrada (${dados.entradaPercentual.toLocaleString('pt-BR')}%)`, xTotal + 12, y, 9, regular, muted);
  direita(moeda(totais.entrada), xTotal + wTotal - 12, y, 10, bold);
  y += 19;
  texto('Saldo na retirada', xTotal + 12, y, 9, regular, muted);
  direita(moeda(totais.saldo), xTotal + wTotal - 12, y, 10, bold);
  y += 34;

  function secao(titulo: string, conteudo: string) {
    if (!conteudo) return;
    espaco(45);
    texto(titulo.toUpperCase(), A4.margem, y, 8, bold, destaque);
    y += 14;
    for (const trecho of linhas(conteudo, largura, 9.5)) {
      espaco(12.5);
      texto(trecho, A4.margem, y, 9.5, regular, muted);
      y += 12.5;
    }
    y += 8.5;
  }
  secao('Condições de pagamento', dados.pagamento);
  secao('Prazo de produção', dados.prazo);
  secao('Retirada / entrega', dados.entrega);
  secao('Observações', dados.observacoes);
  espaco(55);
  y += 25;
  pagina.drawLine({ start: { x: A4.margem, y: A4.altura - y }, end: { x: 280, y: A4.altura - y }, thickness: 0.5, color: muted });
  texto('Aceite do cliente (assinatura e data)', A4.margem, y + 6, 8, regular, muted);

  for (const [indice, folha] of pdf.getPages().entries()) {
    pagina = folha;
    linha(804);
    texto('GYN Acrílico  |  Orçamento comercial  |  Valores em reais (BRL)', A4.margem, 812, 7, regular, muted);
    direita(`${indice + 1} / ${pdf.getPageCount()}`, A4.largura - A4.margem, 812, 7, regular, muted, 45);
  }
  return pdf.save();
}
