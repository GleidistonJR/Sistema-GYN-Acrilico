CREATE TABLE "TextoRapido" (
  "id" TEXT NOT NULL,
  "label" VARCHAR(80) NOT NULL,
  "texto" TEXT NOT NULL,
  "ordem" SERIAL NOT NULL,
  CONSTRAINT "TextoRapido_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TextoRapido" ("id", "label", "texto") VALUES
  ('cadastro', 'Dados cadastro', $modelo$Por gentileza enviar *CNPJ* para cadastro e emissão do pedido.

*Ou os dados abaixo:*
Nome Completo:
CPF:
Endereço:
CEP:$modelo$),
  ('pix', 'Chave PIX', $modelo$*Chave PIX:*
23.650.001/0001-87$modelo$),
  ('endereco', 'Endereço', $modelo$*Localização:*
https://maps.app.goo.gl/ZssR5mjt2B3f9PULA

Rua C-162 nº 124 Qd. 252 Lt. 18 - Setor Jardim América - Goiânia - GO - CEP. 74.255-110$modelo$),
  ('horario', 'Horário de funcionamento', $modelo$*Horário de funcionamento:*
segunda à sexta-feira
das 08:00 às 18:00 horas

*Fechamos para almoço*
das 12:00 as 13:30.$modelo$),
  ('condicoes', 'Condições para produção', $modelo$Tempo médio para ser produzido de *5 dias úteis após aprovação do projeto*.
Para início da produção é solicitado 50% do valor antecipado e o restante no ato da retirada.
Forma de pagamento: Dinheiro, PIX ou cartão de crédito em 2x, e débito.
Retirar na loja, não estamos fazendo entrega.$modelo$),
  ('aprovacao', 'Aprovação Arte', $modelo$Antes de aprovar, confira com atenção os textos, a ortografia, as posições e as medidas informadas. Produziremos conforme a arte aprovada.
 
Após o início da produção, alterações em informações aprovadas poderão gerar custos de refação.
 
Para autorizar a produção, responda: “Aprovado!”$modelo$);
