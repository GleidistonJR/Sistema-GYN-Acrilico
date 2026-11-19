"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verificarLogin } from './actions';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    const dadosUser = await verificarLogin(usuario, senha);

    if (dadosUser.sucesso) {

      router.refresh();
      window.location.href = dadosUser.role === 'OUTRO' ? '/baterPonto'
        : dadosUser.userId ? '/administracao/colaboradores/' + dadosUser.userId : '/atendimento';
    } else {
      setErro(dadosUser.erro ?? 'Usuário ou senha incorretos!');
    }
  }

  const classeInput = "w-full p-2.5 bg-surface-soft border border-line-strong rounded-lg outline-none transition-colors focus:border-amber-400 focus:ring-1 focus:ring-amber-400 mt-2";

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-surface-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl p-5 sm:p-8">

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Goiânia Acrílico</h1>
          <p className="text-muted mt-2">Acesse o sistema de gestão</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {erro && (
            <div className="bg-danger-soft text-danger-ink p-3 rounded-lg text-sm text-center">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-secondary">Usuário</label>
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
            <label className="block text-sm font-medium text-secondary">Senha</label>
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
            className="w-full bg-primary text-white hover:bg-primary-hover hover:cursor-pointer font-bold py-3 rounded-lg transition-colors shadow-lg active:transform active:scale-95"
          >
            Entrar no Sistema
          </button>
        </form>

        <p className="text-center text-xs text-subtle mt-8">
          &copy; 2026 Gleidiston Junior - Sistema GYN Acrílico
        </p>
      </div>
    </main>
  );
}
