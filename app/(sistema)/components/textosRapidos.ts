import { IdCard, QrCode, MapPin, Clock, Package } from 'lucide-react';

export const textosRapidos = [
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
    texto: "Tempo médio para ser produzido de *5 dias úteis após aprovação do projeto*.\nPara início da produção é solicitado 50% do valor antecipado e o restante no ato da retirada.\nForma de pagamento: Dinheiro, PIX ou cartão de crédito em 2x, e débito.\nRetirar na loja, não estamos fazendo entrega.\n",
  },
  {
    id: 'aprovacao',
    label: 'Aprovação Arte',
    icone: Package,
    texto: 'Antes de aprovar, confira com atenção os textos, a ortografia, as posições e as medidas informadas. Produziremos conforme a arte aprovada.\n \nApós o início da produção, alterações em informações aprovadas poderão gerar custos de refação.\n \nPara autorizar a produção, responda: “Aprovado!”',
  },
];

export type TextoRapido = (typeof textosRapidos)[number];
