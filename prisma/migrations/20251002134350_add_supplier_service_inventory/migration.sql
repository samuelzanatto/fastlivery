-- CreateEnum
CREATE TYPE "public"."StockMovementType" AS ENUM ('ADJUSTMENT', 'RESERVATION', 'RELEASE', 'CONSUMPTION', 'CANCELLATION', 'CORRECTION');

-- AlterTable
ALTER TABLE "public"."supplier_services" ADD COLUMN     "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "public"."supplier_service_stock_movements" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" "public"."StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reservedBefore" INTEGER NOT NULL,
    "reservedAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_service_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_service_stock_movements_serviceId_createdAt_idx" ON "public"."supplier_service_stock_movements"("serviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."supplier_service_stock_movements" ADD CONSTRAINT "supplier_service_stock_movements_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."supplier_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
