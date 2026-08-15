import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const regrasDeAcesso: { rota: string; rolesPermitidas: string[] }[] = [
  { rota: '/administracao', rolesPermitidas: ['ADMIN'] },
  { rota: '/baterPonto', rolesPermitidas: ['ADMIN', 'OUTROS'] },
  { rota: '/colaboradores', rolesPermitidas: ['ADMIN',] },
  { rota: '/relatorioPontos', rolesPermitidas: ['ADMIN', 'USER'] },
];

export function proxy(request: NextRequest) {
  const sessao = request.cookies.get('sessao_admin')?.value;

  if (!sessao) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const rotaAtual = request.nextUrl.pathname;

  const regra = regrasDeAcesso.find(r => rotaAtual.startsWith(r.rota));

  // Se achou uma regra e o role da sessão não está na lista permitida, bloqueia
  if (regra && !regra.rolesPermitidas.includes(sessao)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/administracao/:path*',
    '/colaboradores/:path*',
    '/relatorioPontosAdmin/:path*',
    '/baterPonto/:path*'
  ],
};