BEGIN;

ALTER TABLE "MidiaWhatsApp" ADD COLUMN "tamanho" INTEGER;

UPDATE "MidiaWhatsApp" m
SET "tamanho" = a.tamanho
FROM "ArquivoWhatsApp" a
WHERE a."mensagemId" = m."mensagemId";

UPDATE "MidiaWhatsApp"
SET "tamanho" = octet_length(dados)
WHERE "tamanho" IS NULL AND octet_length(dados) > 0;

DROP TRIGGER midia_whatsapp_preparada ON "MidiaWhatsApp";
CREATE TRIGGER midia_whatsapp_preparada
AFTER UPDATE OF "preparadaEm", tamanho ON "MidiaWhatsApp"
FOR EACH ROW WHEN (ROW(NEW."preparadaEm", NEW.tamanho) IS DISTINCT FROM ROW(OLD."preparadaEm", OLD.tamanho))
EXECUTE FUNCTION atualizar_versao_previa_whatsapp();

COMMIT;
