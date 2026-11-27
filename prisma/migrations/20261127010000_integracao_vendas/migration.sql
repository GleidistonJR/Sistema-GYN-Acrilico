CREATE TABLE "IntegracaoBling" (
  "id" INTEGER PRIMARY KEY,
  "credenciais" TEXT NOT NULL
);

CREATE TABLE "EnvioVenda" (
  "id" UUID PRIMARY KEY,
  "usuarioId" TEXT NOT NULL,
  "verificacao" TEXT NOT NULL,
  "etapa" TEXT NOT NULL DEFAULT 'PENDENTE',
  "blingId" BIGINT,
  "blingNumero" BIGINT,
  "trelloUrl" TEXT,
  "carga" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bloqueadoAte" TIMESTAMP(3)
);

CREATE INDEX "EnvioVenda_usuarioId_criadoEm_idx" ON "EnvioVenda"("usuarioId", "criadoEm");
