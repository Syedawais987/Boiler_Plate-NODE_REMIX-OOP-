-- CreateTable
CREATE TABLE "PaymentMapping" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "payId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMapping_payId_key" ON "PaymentMapping"("payId");
