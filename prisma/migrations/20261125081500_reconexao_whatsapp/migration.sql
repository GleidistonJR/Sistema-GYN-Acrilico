ALTER TABLE "EstadoServicoWhatsApp"
ADD COLUMN "qr" TEXT,
ADD COLUMN "qrExpiraEm" TIMESTAMP(3),
ADD COLUMN "mensagem" TEXT,
ADD COLUMN "comando" TEXT,
ADD COLUMN "comandoEm" TIMESTAMP(3);
