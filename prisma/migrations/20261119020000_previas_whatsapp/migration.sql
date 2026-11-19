ALTER TABLE "MidiaWhatsApp" ADD COLUMN "previa" BYTEA,
ADD COLUMN "preparadaEm" TIMESTAMP(3);

CREATE INDEX "MensagemWhatsApp_conta_enviadoEm_idx" ON "MensagemWhatsApp"("conta", "enviadoEm");

CREATE FUNCTION atualizar_versao_previa_whatsapp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Cliente" c SET "versaoMensagens" = c."versaoMensagens" + 1
  FROM "MensagemWhatsApp" m
  WHERE m.id = NEW."mensagemId" AND c.id = m."clienteId";
  RETURN NULL;
END;
$$;

CREATE TRIGGER midia_whatsapp_preparada
AFTER UPDATE OF "preparadaEm" ON "MidiaWhatsApp"
FOR EACH ROW WHEN (NEW."preparadaEm" IS DISTINCT FROM OLD."preparadaEm")
EXECUTE FUNCTION atualizar_versao_previa_whatsapp();
