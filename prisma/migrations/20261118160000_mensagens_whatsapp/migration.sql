-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "ultimaMensagemEm" TIMESTAMP(3),
ALTER COLUMN "telefone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "IdentidadeWhatsApp" (
    "conta" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,

    CONSTRAINT "IdentidadeWhatsApp_pkey" PRIMARY KEY ("conta","jid")
);

-- CreateTable
CREATE TABLE "MensagemWhatsApp" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "conta" TEXT NOT NULL,
    "externaId" TEXT,
    "pedidoId" TEXT,
    "conteudoHash" TEXT,
    "autorId" TEXT,
    "direcao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'chat',
    "texto" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "ack" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensagemWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MidiaWhatsApp" (
    "mensagemId" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "MidiaWhatsApp_pkey" PRIMARY KEY ("mensagemId")
);

-- CreateIndex
CREATE INDEX "IdentidadeWhatsApp_clienteId_idx" ON "IdentidadeWhatsApp"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "MensagemWhatsApp_pedidoId_key" ON "MensagemWhatsApp"("pedidoId");

-- CreateIndex
CREATE INDEX "MensagemWhatsApp_clienteId_enviadoEm_id_idx" ON "MensagemWhatsApp"("clienteId", "enviadoEm", "id");

-- CreateIndex
CREATE INDEX "MensagemWhatsApp_status_createdAt_idx" ON "MensagemWhatsApp"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MensagemWhatsApp_conta_externaId_key" ON "MensagemWhatsApp"("conta", "externaId");

-- CreateIndex
CREATE INDEX "Cliente_responsavelId_ultimaMensagemEm_idx" ON "Cliente"("responsavelId", "ultimaMensagemEm");

-- AddForeignKey
ALTER TABLE "IdentidadeWhatsApp" ADD CONSTRAINT "IdentidadeWhatsApp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MidiaWhatsApp" ADD CONSTRAINT "MidiaWhatsApp_mensagemId_fkey" FOREIGN KEY ("mensagemId") REFERENCES "MensagemWhatsApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
