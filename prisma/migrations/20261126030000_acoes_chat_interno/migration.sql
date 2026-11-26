BEGIN;

ALTER TABLE "MensagemInterna"
ADD COLUMN "apagadaEm" TIMESTAMP(3),
ADD COLUMN "encaminhada" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "MensagemInterna_apagadas_idx"
ON "MensagemInterna" ("remetenteChave", "destinatarioChave", id)
WHERE "apagadaEm" IS NOT NULL;

COMMIT;
