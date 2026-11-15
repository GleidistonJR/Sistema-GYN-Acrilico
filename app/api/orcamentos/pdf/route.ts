import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { obterUsuarioSessao } from '@/lib/sessao';
import { validarOrcamentoFormal } from '@/lib/orcamentoFormal';
import { gerarOrcamentoPdf } from '@/lib/gerarOrcamentoPdf';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !['ADMIN', 'USER'].includes(usuario.role)) return Response.json({ erro: 'Faça login novamente para gerar o PDF.' }, { status: 401 });
  if (Number(request.headers.get('content-length')) > 300_000) return Response.json({ erro: 'Orçamento muito grande.' }, { status: 413 });
  let dados;
  try {
    const corpo = await request.text();
    if (corpo.length > 300_000) throw new Error('Orçamento muito grande.');
    dados = validarOrcamentoFormal(JSON.parse(corpo));
  } catch (error) {
    return Response.json({ erro: error instanceof SyntaxError ? 'Dados do orçamento inválidos.' : error instanceof Error ? error.message : 'Confira os dados do orçamento.' }, { status: 400 });
  }
  try {
    const logo = await readFile(path.join(process.cwd(), 'public', 'logo-gyn-acrilico.png'));
    const arquivo = await gerarOrcamentoPdf(dados, logo);
    const referencia = dados.referencia.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '-');
    return new Response(new Uint8Array(arquivo), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="orcamento-${referencia}.pdf"`, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Erro ao gerar orçamento em PDF:', error);
    return Response.json({ erro: 'Não foi possível gerar o PDF. Tente novamente.' }, { status: 500 });
  }
}
