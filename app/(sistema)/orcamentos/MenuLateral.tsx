"use client";
import { useState } from 'react';
import { ClipboardCopy, Check, IdCard, QrCode, MapPin, Clock, Package, ExternalLink } from 'lucide-react';

interface MenuLateralProps {
  isOpen: boolean;
}

const itensRapidos = [
  {
    id: 'cadastro',
    label: 'Dados cadastro',
    icone: IdCard,
    texto: "Por gentileza enviar *CNPJ* para cadastro e emissão do pedido.\n\n*Ou os dados abaixo:*\nNome Completo:\nCPF:\nEndereço:\nCEP:",
  },
  {
    id: 'pix',
    label: 'Chave PIX',
    icone: QrCode,
    texto: "*Chave PIX:*\n23.650.001/0001-87",
  },
  {
    id: 'endereco',
    label: 'Endereço',
    icone: MapPin,
    texto: "*Localização:*\nhttps://maps.app.goo.gl/ZssR5mjt2B3f9PULA\n\nRua C-162 nº 124 Qd. 252 Lt. 18 - Setor Jardim América - Goiânia - GO - CEP. 74.255-110",
  },
  {
    id: 'horario',
    label: 'Horário de funcionamento',
    icone: Clock,
    texto: "*Horário de funcionamento:*\nsegunda à sexta-feira\ndas 08:00 às 18:00 horas\n\n*Fechamos para almoço*\ndas 12:00 as 13:30.",
  },
  {
    id: 'condicoes',
    label: 'Condições para produção',
    icone: Package,
    texto: "Tempo médio para ser produzido de 5 dias úteis.\nPara início da produção é solicitado 50% do valor antecipado e o restante no ato da retirada.\nForma de pagamento: Dinheiro, PIX ou cartão de crédito em 2x, e débito.\nRetirar na loja, não estamos fazendo entrega.\n",
  },
];

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
      className={`fixed top-0 left-0 h-full w-80 bg-white pt-34 p-5 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
        Textos rápidos
      </p>

      <div className="space-y-2">
        {itensRapidos.map(({ id, label, icone: Icone, texto }) => {
          const copiado = copiadoId === id;
          return (
            <button
              key={id}
              onClick={() => copiarTexto(id, texto)}
              className={`w-full flex items-center gap-3 text-left px-4 py-2.5 rounded-lg border transition-all duration-150 ${
                copiado
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-[#0A2540] border-[#0A2540] text-white hover:bg-[#0f3a6b] hover:cursor-pointer'
              }`}
            >
              {copiado ? <Check size={17} className="shrink-0" /> : <Icone size={17} className="shrink-0 text-amber-400" />}
              <span className="text-sm font-medium flex-1">{copiado ? 'Copiado!' : label}</span>
              {!copiado && <ClipboardCopy size={14} className="shrink-0 opacity-50" />}
            </button>
          );
        })}
      </div>

      <div className="pt-5 mt-5 border-t border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Consultas externas
        </p>

        <div className="space-y-2">
          {consultasExternas.map(({ label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700 transition-colors"
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