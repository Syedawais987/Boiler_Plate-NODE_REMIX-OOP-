/*
  Warnings:

  - A unique constraint covering the columns `[shopifyVariantId]` on the table `ProductMapping` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ProductMapping" ADD COLUMN     "shopifyVariantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductMapping_shopifyVariantId_key" ON "ProductMapping"("shopifyVariantId");
