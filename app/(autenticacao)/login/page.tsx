"use client";
import { useState } from 'react';
import { setCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const router = useRouter();

  // O Next.js carrega automaticamente as variáveis do .env para o process.env
const adminUser = process.env.NEXT_PUBLIC_ADMIN_USER;
const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASS;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (usuario === adminUser && senha === adminPass) {

      // Criamos o cookie que o Middleware procura
      // maxAge: 3600 = 1 hora de validade
      setCookie('sessao_admin', 'true', { maxAge: 60 * 60 });

      router.refresh();
      window.location.href = '/administracao'; // Redireciona após o sucesso
    } else {
      setErro('Usuário ou senha incorretos!');
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Goiânia Acrílico</h1>
          <p className="text-gray-500 mt-2">Acesse o sistema de gestão</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {erro && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Usuário</label>
            <input
              type="text"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
              placeholder="Digite seu usuário"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg active:transform active:scale-95"
          >
            Entrar no Sistema
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          &copy; 2026 Gleidiston Junior - Sistema GYN Acrílico
        </p>
      </div>
    </main>
  );
}