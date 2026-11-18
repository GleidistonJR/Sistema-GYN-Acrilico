CREATE TABLE "FotoContato" (
  "clienteId" TEXT PRIMARY KEY REFERENCES "Cliente"(id) ON DELETE CASCADE,
  url TEXT,
  "consultadaEm" TIMESTAMP(3),
  pendente BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX "FotoContato_pendentes" ON "FotoContato"("clienteId") WHERE pendente;
