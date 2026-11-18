CREATE TABLE "TransferenciaWhatsApp" (
  "tokenHash" TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "TransferenciaWhatsApp_expiresAt_idx" ON "TransferenciaWhatsApp"("expiresAt");
CREATE TABLE "PonteMidiaWhatsApp" (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  "atualizadoEm" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "ArquivoWhatsApp" (
  "mensagemId" TEXT PRIMARY KEY REFERENCES "MensagemWhatsApp"(id) ON DELETE CASCADE,
  chave TEXT NOT NULL UNIQUE,
  tamanho INTEGER NOT NULL
);
