-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Produto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "tipoVenda" TEXT NOT NULL,
    "precoBase" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "insumoId" TEXT,
    CONSTRAINT "Produto_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Produto" ("createdAt", "id", "nome", "precoBase", "tipoVenda", "updatedAt") SELECT "createdAt", "id", "nome", "precoBase", "tipoVenda", "updatedAt" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
CREATE UNIQUE INDEX "Produto_insumoId_key" ON "Produto"("insumoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
