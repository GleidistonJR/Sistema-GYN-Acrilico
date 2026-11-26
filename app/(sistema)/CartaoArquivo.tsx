import { FileText } from 'lucide-react';

export default function CartaoArquivo({ nome, formato, tamanho, acao, onClick, disabled }: {
  nome: string; formato: string; tamanho?: number | null; acao: string;
  onClick: () => void; disabled?: boolean;
}) {
  let peso = '';
  if (typeof tamanho === 'number' && tamanho > 0) {
    const [unidade, divisor] = tamanho >= 1024 ** 2 ? ['MB', 1024 ** 2] : tamanho >= 1024 ? ['KB', 1024] : ['B', 1];
    peso = `${(tamanho / Number(divisor)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidade}`;
  }
  return <button type="button" aria-label={`${acao} ${nome}`} title={acao} onClick={onClick} disabled={disabled}
    className="flex w-64 max-w-full items-center gap-3 rounded-lg bg-foreground/5 p-3 text-left hover:bg-foreground/10 disabled:opacity-60">
    <FileText size={30} aria-hidden="true" className="shrink-0 text-muted" />
    <span className="min-w-0">
      <span className="block break-words text-sm font-semibold">{nome}</span>
      <span className="block text-xs text-muted">{[peso, formato].filter(Boolean).join(' · ')}</span>
    </span>
  </button>;
}
