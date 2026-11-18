import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { obterUsuarioSessao, renovarSessaoPersistente } from '@/lib/sessao';

const regrasDeAcesso: { rota: string; rolesPermitidas: string[] }[] = [
  { rota: '/administracao', rolesPermitidas: ['ADMIN'] },
  { rota: '/orcamentos', rolesPermitidas: ['ADMIN', 'USER',] },
  { rota: '/atendimento/conexao', rolesPermitidas: ['ADMIN'] },
  { rota: '/atendimento', rolesPermitidas: ['ADMIN', 'USER'] },
  { rota: '/produtos', rolesPermitidas: ['ADMIN', 'USER'] },
  { rota: '/materiais', rolesPermitidas: ['ADMIN', 'USER',] },
  { rota: '/baterPonto', rolesPermitidas: ['ADMIN', 'OUTRO'] },
  { rota: '/relatorioPontos', rolesPermitidas: ['ADMIN', 'USER', 'OUTRO'] },
];

export async function proxy(request: NextRequest) {
  const sessao = await obterUsuarioSessao();
  if (!sessao) return NextResponse.redirect(new URL('/login', request.url));
  async function permitir() {
    const response = NextResponse.next();
    // Server Actions may be signing out; do not re-set their deleted cookie.
    if (request.method === 'GET') {
      const cookie = await renovarSessaoPersistente(sessao!.sessaoExpiraEm);
      if (cookie) response.cookies.set(cookie);
    }
    return response;
  }

  const rotaAtual = request.nextUrl.pathname;

  // Caso especial: página do próprio colaborador dentro de /administracao/colaboradores/[id]
  const matchPerfilProprio = rotaAtual.match(/^\/administracao\/colaboradores\/([^/]+)/);

  if (matchPerfilProprio) {
    const idNaRota = matchPerfilProprio[1];

    // ADMIN sempre pode acessar qualquer perfil
    if (sessao.role === 'ADMIN') {
      return permitir();
    }

    // USER só pode acessar se o id da rota for o dele mesmo
    if (sessao.role === 'USER' && String(sessao.colaborador?.id) === idNaRota) {
      return permitir();
    }

    // Qualquer outro caso, bloqueia
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const regra = regrasDeAcesso.find(r => rotaAtual.startsWith(r.rota));

  if (regra && !regra.rolesPermitidas.includes(sessao.role)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return permitir();
}

export const config = {
  matcher: [
    '/administracao/:path*',
    '/orcamentos/:path*',
    '/materiais/:path*',
    '/produtos/:path*',
    '/atendimento/:path*',
    '/relatorioPontos/:path*',
    '/baterPonto/:path*'
  ],
};
