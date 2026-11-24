ALTER TABLE "MensagemInterna"
    ALTER COLUMN "remetenteId" DROP NOT NULL,
    ALTER COLUMN "destinatarioId" DROP NOT NULL,
    ADD COLUMN "remetenteAvulsoId" TEXT,
    ADD COLUMN "destinatarioAvulsoId" TEXT,
    ADD COLUMN "remetenteChave" TEXT GENERATED ALWAYS AS (
        COALESCE("remetenteId"::text, 'avulso-' || "remetenteAvulsoId")
    ) STORED NOT NULL,
    ADD COLUMN "destinatarioChave" TEXT GENERATED ALWAYS AS (
        COALESCE("destinatarioId"::text, 'avulso-' || "destinatarioAvulsoId")
    ) STORED NOT NULL,
    DROP CONSTRAINT "MensagemInterna_participantes_diferentes",
    ADD CONSTRAINT "MensagemInterna_participantes_validos" CHECK (
        num_nonnulls("remetenteId", "remetenteAvulsoId") = 1
        AND num_nonnulls("destinatarioId", "destinatarioAvulsoId") = 1
        AND "remetenteChave" <> "destinatarioChave"
    );

CREATE INDEX "MensagemInterna_remetenteChave_destinatarioChave_id_idx"
    ON "MensagemInterna"("remetenteChave", "destinatarioChave", "id");
CREATE INDEX "MensagemInterna_destinatarioChave_lidaEm_remetenteChave_id_idx"
    ON "MensagemInterna"("destinatarioChave", "lidaEm", "remetenteChave", "id");
CREATE UNIQUE INDEX "MensagemInterna_remetenteChave_pedidoId_key"
    ON "MensagemInterna"("remetenteChave", "pedidoId");
