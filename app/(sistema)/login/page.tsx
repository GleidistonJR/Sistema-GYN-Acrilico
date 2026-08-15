"use client";
import { useState } from 'react';
import { setCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { verificarLogin } from './actions';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const resultado = await verificarLogin(usuario, senha);

    if (resultado.sucesso) {
      setCookie('sessao_admin', resultado.role ?? 'USER', { maxAge: 60 * 60 * 6 });
      router.refresh();
      window.location.href = '/orcamentos';
    } else {
      setErro(resultado.erro ?? 'Usuário ou senha incorretos!');
    }
  };

  const classeInput = "w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400 mt-2";

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
              className={classeInput}
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
              className={classeInput}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#0A2540] text-white hover:bg-[#0f3a6b] hover:cursor-pointer font-bold py-3 rounded-lg transition-colors shadow-lg active:transform active:scale-95"
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