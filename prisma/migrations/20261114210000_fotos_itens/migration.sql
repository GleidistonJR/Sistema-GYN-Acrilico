CREATE TABLE "FotoItem" (
    "id" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "materialId" TEXT,
    "produtoId" TEXT,
    CONSTRAINT "FotoItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FotoItem_um_dono" CHECK (("materialId" IS NOT NULL)::int + ("produtoId" IS NOT NULL)::int = 1)
);
CREATE UNIQUE INDEX "FotoItem_materialId_key" ON "FotoItem"("materialId");
CREATE UNIQUE INDEX "FotoItem_produtoId_key" ON "FotoItem"("produtoId");
ALTER TABLE "FotoItem" ADD CONSTRAINT "FotoItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FotoItem" ADD CONSTRAINT "FotoItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
