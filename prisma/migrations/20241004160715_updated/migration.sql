-- CreateTable
CREATE TABLE "OrderMapping" (
    "id" TEXT NOT NULL,
    "woocommerceOrderId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderMapping_woocommerceOrderId_key" ON "OrderMapping"("woocommerceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderMapping_shopifyOrderId_key" ON "OrderMapping"("shopifyOrderId");
