import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Definimos as rotas que precisam de proteção
  const isProtectedRoute = ['/administracao', '/colaboradores', '/relatorioPontosAdmin'];

  if (isProtectedRoute) {
    // 2. Verificamos se o cookie de sessão existe
    const sessao = request.cookies.get('sessao_admin');

    if (!sessao) {
      // Se não tiver o cookie, redireciona para a página de login
      // O segundo argumento 'request.url' serve para o Next saber a base da URL (localhost ou site real)
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Se tiver o cookie ou não for uma rota protegida, deixa passar
  return NextResponse.next();
}

// 3. O matcher garante que o middleware rode apenas nas páginas certas
// Adicionei o matcher para a pasta de colaboradores
export const config = {
  matcher: [
    '/administracao/:path*',
    '/colaboradores/:path*',
    '/relatorioPontosAdmin/:path*'
  ],
};