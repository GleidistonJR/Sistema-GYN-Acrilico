'use client';

export default function ErrorAtendimento({ reset }: { reset: () => void }) {
  return <section className="p-8"><h1 className="text-xl font-semibold">Não foi possível carregar o atendimento</h1>
    <p className="my-4">Verifique sua sessão e tente novamente.</p>
    <button onClick={reset} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Tentar novamente</button>
  </section>;
}
