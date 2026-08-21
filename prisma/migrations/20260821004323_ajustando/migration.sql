/*
  Warnings:

  - Added the required column `categoriaId` to the `Material` table without a default value. This is not possible if the table is not empty.
  - Added the required column `custo` to the `Material` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estoque` to the `Material` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "categoriaId" TEXT NOT NULL,
ADD COLUMN     "custo" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "estoque" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "MaterialCatogoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "MaterialCatogoria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "MaterialCatogoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
