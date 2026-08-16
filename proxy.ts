import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const regrasDeAcesso: { rota: string; rolesPermitidas: string[] }[] = [
  { rota: '/administracao', rolesPermitidas: ['ADMIN'] },
  { rota: '/orcamentos', rolesPermitidas: ['ADMIN', 'USER',] },
  { rota: '/baterPonto', rolesPermitidas: ['ADMIN', 'OUTRO'] },
  { rota: '/relatorioPontos', rolesPermitidas: ['ADMIN', 'USER', 'OUTRO'] },
];

export function proxy(request: NextRequest) {
  const sessaoCookie = request.cookies.get('sessao_admin')?.value;

  if (!sessaoCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  let sessao: { role: string; userId?: number; userNome?: string };
  try {
    sessao = JSON.parse(sessaoCookie);
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const rotaAtual = request.nextUrl.pathname;

  // Caso especial: página do próprio colaborador dentro de /administracao/colaboradores/[id]
  const matchPerfilProprio = rotaAtual.match(/^\/administracao\/colaboradores\/([^/]+)/);

  if (matchPerfilProprio) {
    const idNaRota = matchPerfilProprio[1];

    // ADMIN sempre pode acessar qualquer perfil
    if (sessao.role === 'ADMIN') {
      return NextResponse.next();
    }

    // USER só pode acessar se o id da rota for o dele mesmo
    if (sessao.role === 'USER' && String(sessao.userId) === idNaRota) {
      return NextResponse.next();
    }

    // Qualquer outro caso, bloqueia
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const regra = regrasDeAcesso.find(r => rotaAtual.startsWith(r.rota));

  if (regra && !regra.rolesPermitidas.includes(sessao.role)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/administracao/:path*',
    '/orcamentos/:path*',
    '/relatorioPontos/:path*',
    '/baterPonto/:path*'
  ],
};