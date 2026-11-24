CREATE TABLE "MensagemInterna" (
    "id" SERIAL NOT NULL,
    "remetenteId" INTEGER NOT NULL,
    "destinatarioId" INTEGER NOT NULL,
    "pedidoId" UUID NOT NULL,
    "texto" VARCHAR(4000) NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lidaEm" TIMESTAMP(3),
    CONSTRAINT "MensagemInterna_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MensagemInterna_participantes_diferentes" CHECK ("remetenteId" <> "destinatarioId"),
    CONSTRAINT "MensagemInterna_remetenteId_fkey" FOREIGN KEY ("remetenteId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MensagemInterna_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MensagemInterna_remetenteId_destinatarioId_id_idx"
    ON "MensagemInterna"("remetenteId", "destinatarioId", "id");
CREATE INDEX "MensagemInterna_destinatarioId_lidaEm_remetenteId_id_idx"
    ON "MensagemInterna"("destinatarioId", "lidaEm", "remetenteId", "id");
CREATE UNIQUE INDEX "MensagemInterna_remetenteId_pedidoId_key"
    ON "MensagemInterna"("remetenteId", "pedidoId");
