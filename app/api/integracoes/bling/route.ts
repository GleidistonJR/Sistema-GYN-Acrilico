import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { obterUsuarioSessao } from '@/lib/sessao';
import { conectarBling, configuracaoBling } from '@/lib/integracoes/bling';

const cookie = 'gyn_bling_oauth';

export async function GET(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (usuario?.role !== 'ADMIN') return new Response('Acesso restrito à Administração.', { status: 403 });
  const config = configuracaoBling();
  if (!config) return new Response('A configuração do Bling precisa ser preenchida na VPS.', { status: 503 });

  const url = new URL(request.url);
  const codigo = url.searchParams.get('code');
  const estado = url.searchParams.get('state');
  if (codigo || estado || url.searchParams.has('error')) {
    const esperado = (await cookies()).get(cookie)?.value;
    const sucesso = NextResponse.redirect(new URL('/administracao?bling=conectado', config.retorno));
    const falha = NextResponse.redirect(new URL('/administracao?bling=erro', config.retorno));
    for (const resposta of [sucesso, falha]) resposta.cookies.set(cookie, '', { path: url.pathname, maxAge: 0 });
    if (!codigo || !estado || esperado !== estado + ':' + usuario.id) return falha;
    try {
      await conectarBling(codigo);
      return sucesso;
    } catch {
      return falha;
    }
  }

  const novoEstado = randomBytes(32).toString('hex');
  const autorizacao = new URL('https://bling.com.br/Api/v3/oauth/authorize');
  autorizacao.search = new URLSearchParams({ response_type: 'code', client_id: config.id, state: novoEstado }).toString();
  const resposta = NextResponse.redirect(autorizacao);
  resposta.cookies.set(cookie, novoEstado + ':' + usuario.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: url.pathname });
  return resposta;
}
