-- Existing and new materials start without a replenishment target.
ALTER TABLE "Material" ADD COLUMN "estoquePadrao" INTEGER NOT NULL DEFAULT 0;
