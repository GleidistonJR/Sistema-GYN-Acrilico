ALTER TABLE "MensagemInterna"
    ADD COLUMN "citacaoId" INTEGER,
    ADD COLUMN "anexoNome" TEXT,
    ADD COLUMN "anexoMime" TEXT,
    ADD COLUMN "anexoDados" BYTEA,
    ADD CONSTRAINT "MensagemInterna_citacaoId_fkey"
        FOREIGN KEY ("citacaoId") REFERENCES "MensagemInterna"(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MensagemInterna_citacaoId_idx" ON "MensagemInterna"("citacaoId");
