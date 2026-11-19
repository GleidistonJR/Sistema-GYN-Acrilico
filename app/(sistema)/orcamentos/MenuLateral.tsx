"use client";
import { useState } from 'react';
import { ClipboardCopy, Check, ExternalLink } from 'lucide-react';
import { textosRapidos } from '../components/textosRapidos';

interface MenuLateralProps {
  isOpen: boolean;
}

const consultasExternas = [
  { label: 'CNPJ', url: 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp' },
  { label: 'CPF', url: 'https://www.situacao-cadastral.com/' },
  { label: 'Inscrição estadual', url: 'http://www.sintegra.gov.br/' },
];

export default function MenuLateral({ isOpen }: MenuLateralProps) {
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const copiarTexto = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto.trim())
      .then(() => {
        setCopiadoId(id);
        setTimeout(() => setCopiadoId(null), 1500);
      })
      .catch((err) => console.error('Erro ao copiar texto: ', err));
  };

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed top-16 bottom-0 left-0 w-80 max-w-[calc(100vw-1rem)] bg-surface pt-18 p-5 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'invisible -translate-x-full'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-subtle mb-3">
        Textos rápidos
      </p>

      <div className="space-y-2">
        {textosRapidos.map(({ id, label, icone: Icone, texto }) => {
          const copiado = copiadoId === id;
          return (
            <button
              key={id}
              onClick={() => copiarTexto(id, texto)}
              className={`w-full flex items-center gap-3 text-left px-4 py-2.5 rounded-lg border transition-all duration-150 ${
                copiado
                  ? 'bg-warning-soft border-warning-line text-warning-ink'
                  : 'bg-primary border-primary-ink text-white hover:bg-primary-hover hover:cursor-pointer'
              }`}
            >
              {copiado ? <Check size={17} className="shrink-0" /> : <Icone size={17} className="shrink-0 text-warning-ink" />}
              <span className="text-sm font-medium flex-1">{copiado ? 'Copiado!' : label}</span>
              {!copiado && <ClipboardCopy size={14} className="shrink-0 opacity-50" />}
            </button>
          );
        })}
      </div>

      <div className="pt-5 mt-5 border-t border-line">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle mb-3">
          Consultas externas
        </p>

        <div className="space-y-2">
          {consultasExternas.map(({ label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-line text-secondary font-medium text-sm hover:border-warning-line hover:bg-warning-soft/50 hover:text-warning-ink transition-colors"
            >
              {label}
              <ExternalLink size={14} className="opacity-40" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
