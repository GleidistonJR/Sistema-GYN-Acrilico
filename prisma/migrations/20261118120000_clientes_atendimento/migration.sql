-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "telefone" VARCHAR(16) NOT NULL,
    "responsavelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(40) NOT NULL,

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteEtiqueta" (
    "clienteId" TEXT NOT NULL,
    "etiquetaId" TEXT NOT NULL,

    CONSTRAINT "ClienteEtiqueta_pkey" PRIMARY KEY ("clienteId","etiquetaId")
);

-- CreateTable
CREATE TABLE "AtribuicaoCliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "atorId" TEXT,
    "anteriorId" TEXT,
    "novoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtribuicaoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefone_key" ON "Cliente"("telefone");

-- CreateIndex
CREATE INDEX "Cliente_responsavelId_nome_id_idx" ON "Cliente"("responsavelId", "nome", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_nome_key" ON "Etiqueta"("nome");

-- CreateIndex
CREATE INDEX "ClienteEtiqueta_etiquetaId_idx" ON "ClienteEtiqueta"("etiquetaId");

-- CreateIndex
CREATE INDEX "AtribuicaoCliente_clienteId_createdAt_idx" ON "AtribuicaoCliente"("clienteId", "createdAt");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteEtiqueta" ADD CONSTRAINT "ClienteEtiqueta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteEtiqueta" ADD CONSTRAINT "ClienteEtiqueta_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtribuicaoCliente" ADD CONSTRAINT "AtribuicaoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtribuicaoCliente" ADD CONSTRAINT "AtribuicaoCliente_atorId_fkey" FOREIGN KEY ("atorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
