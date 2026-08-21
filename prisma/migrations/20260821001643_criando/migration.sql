/*
  Warnings:

  - You are about to drop the `Insumo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Produto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProdutoInsumo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Produto" DROP CONSTRAINT "Produto_insumoId_fkey";

-- DropForeignKey
ALTER TABLE "ProdutoInsumo" DROP CONSTRAINT "ProdutoInsumo_insumoId_fkey";

-- DropForeignKey
ALTER TABLE "ProdutoInsumo" DROP CONSTRAINT "ProdutoInsumo_produtoId_fkey";

-- DropTable
DROP TABLE "Insumo";

-- DropTable
DROP TABLE "Produto";

-- DropTable
DROP TABLE "ProdutoInsumo";

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "espessura" TEXT,
    "cor" TEXT,
    "descricao" TEXT,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);
