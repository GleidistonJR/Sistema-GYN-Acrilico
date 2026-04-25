-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ponto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cpf" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ponto_cpf_fkey" FOREIGN KEY ("cpf") REFERENCES "Colaborador" ("cpf") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Ponto" ("cpf", "dataHora", "id", "tipo") SELECT "cpf", "dataHora", "id", "tipo" FROM "Ponto";
DROP TABLE "Ponto";
ALTER TABLE "new_Ponto" RENAME TO "Ponto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
