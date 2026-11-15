interface Props { comprimento: string; largura: string; altura: string; }

export default function GuiaMedidasCaixa({ comprimento, largura, altura }: Props) {
  const medida = (valor: string) => Number(valor) > 0 ? `${Number(valor).toLocaleString('pt-BR')} cm` : 'cm';
  return (
    <figure className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <figcaption id="guia-medidas-caixa" className="text-sm font-semibold text-slate-700">Ordem das medidas: comprimento × largura × altura</figcaption>
      <svg viewBox="0 0 360 235" role="img" aria-label="Caixa vista de frente e por cima: comprimento na frente, largura da frente para trás e altura na vertical. Desenho ilustrativo, sem escala." className="mx-auto w-full max-w-sm">
        <polygon points="55,95 125,45 285,45 215,95" fill="#fff" stroke="#64748b" strokeWidth="1.5" />
        <polygon points="55,95 215,95 215,180 55,180" fill="#e2e8f0" fillOpacity="0.7" stroke="#64748b" strokeWidth="1.5" />
        <polygon points="215,95 285,45 285,130 215,180" fill="#cbd5e1" fillOpacity="0.7" stroke="#64748b" strokeWidth="1.5" />
        <path d="M125 45 V130 L55 180 M125 130 H285" fill="none" stroke="#94a3b8" strokeDasharray="4 4" />
        <text x="170" y="77" textAnchor="middle" fontSize="12" fill="#64748b">Abertura / tampa</text>
        <path d="M55 192 V204 M55 198 H215 M215 192 V204" fill="none" stroke="#0369a1" strokeWidth="2" />
        <text x="135" y="221" textAnchor="middle" fontSize="13" fontWeight="600" fill="#0369a1">C: {medida(comprimento)}</text>
        <path d="M230 190 L300 140 M225 185 L235 195 M295 135 L305 145" fill="none" stroke="#047857" strokeWidth="2" />
        <text x="280" y="191" textAnchor="middle" transform="rotate(-35 280 191)" fontSize="13" fontWeight="600" fill="#047857">L: {medida(largura)}</text>
        <path d="M305 45 H317 M311 45 V130 M305 130 H317" fill="none" stroke="#9333ea" strokeWidth="2" />
        <text x="337" y="88" textAnchor="middle" transform="rotate(-90 337 88)" fontSize="13" fontWeight="600" fill="#9333ea">A: {medida(altura)}</text>
      </svg>
      <div className="space-y-1 text-xs leading-relaxed text-slate-600">
        <p><strong className="text-sky-700">C — Comprimento:</strong> da esquerda para a direita, na frente da caixa.</p>
        <p><strong className="text-emerald-700">L — Largura:</strong> da frente para trás. Junto com o comprimento, forma o fundo.</p>
        <p><strong className="text-purple-600">A — Altura:</strong> do fundo até a abertura, na vertical.</p>
        <p className="pt-1">Na caixa sem tampa, calculamos 1 fundo + 4 paredes. Trocar a altura pela largura muda o consumo de material e o preço.</p>
        <p className="text-slate-400">Desenho ilustrativo, sem escala.</p>
      </div>
    </figure>
  );
}
