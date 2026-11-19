ALTER TABLE "Cliente"
ADD COLUMN "conversaExcluidaEm" TIMESTAMP(3),
ADD COLUMN "versaoEntradaExcluida" BIGINT NOT NULL DEFAULT 0;
