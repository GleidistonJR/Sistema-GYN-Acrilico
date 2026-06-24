"use client";

interface MenuLateralProps {
  isOpen: boolean;
}

export default function MenuLateral({ isOpen }: MenuLateralProps) {
  const copiarTexto = (e: React.MouseEvent<HTMLButtonElement>) => {
    const texto = e.currentTarget.getAttribute('data-texto');
    if (texto) {
      navigator.clipboard.writeText(texto.trim())
        .catch((err) => console.error('Erro ao copiar texto: ', err));
    }
  };

  return (
    <div className={`fixed top-0 left-0 h-full w-80 bg-white p-5 pt-20 space-y-3 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div>
        <button
          onClick={copiarTexto}
          className="w-full text-left border px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-500 hover:cursor-pointer transition-colors"
          data-texto={"Por gentileza enviar *CNPJ* para cadastro e emissão do pedido.\n\n*Ou os dados abaixo:*\nNome Completo:\nCPF:\nEndereço:\nCEP:"}
        >
          Dados Cadastro
        </button>
      </div>

      <div>
        <button
          onClick={copiarTexto}
          className="w-full text-left border px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-500 hover:cursor-pointer transition-colors"
          data-texto={"*Chave PIX:*\n23.650.001/0001-87"}
        >
          Chave PIX
        </button>
      </div>

      <div>
        <button
          onClick={copiarTexto}
          className="w-full text-left border px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-500 hover:cursor-pointer transition-colors"
          data-texto={"*Localização:*\nhttps://maps.app.goo.gl/ZssR5mjt2B3f9PULA\n\nRua C-162 nº 124 Qd. 252 Lt. 18 - Setor Jardim América - Goiânia - GO - CEP. 74.255-110"}
        >
          Endereço
        </button>
      </div>

      <div>
        <button
          onClick={copiarTexto}
          className="w-full text-left border px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-500 hover:cursor-pointer transition-colors"
          data-texto={"*Horário de funcionamento:*\nsegunda à sexta-feira\ndas 08:00 às 18:00 horas\n\n*Fechamos para almoço*\ndas 12:00 as 13:30."}
        >
          Horário Funcionamento
        </button>
      </div>

      <div>
        <button
          onClick={copiarTexto}
          className="w-full text-left border px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-500 hover:cursor-pointer transition-colors"
          data-texto={"Tempo médio para ser produzido de 5 dias úteis.\nPara início da produção é solicitado 50% do valor antecipado e o restante no ato da retirada.\nForma de pagamento: Dinheiro, PIX ou cartão de crédito em 2x, e débito.\nRetirar na loja, não estamos fazendo entrega.\n"}
        >
          Condições para Produção
        </button>
      </div>

      <div className="pt-4 border-t border-gray-200 space-y-2">
        <a href="https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp" target="_blank" rel="noreferrer" className="block text-center border px-5 py-2 bg-yellow-500 text-white font-semibold rounded hover:bg-yellow-400 hover:cursor-pointer">
          CNPJ
        </a>
        <a href="https://www.situacao-cadastral.com/" target="_blank" rel="noreferrer" className="block text-center border px-5 py-2 bg-yellow-500 text-white font-semibold rounded hover:bg-yellow-400 hover:cursor-pointer">
          CPF
        </a>
        <a href="http://www.sintegra.gov.br/" target="_blank" rel="noreferrer" className="block text-center border px-5 py-2 bg-yellow-500 text-white font-semibold rounded hover:bg-yellow-400 hover:cursor-pointer">
          Inscrição Estadual
        </a>
      </div>
    </div>
  );
}