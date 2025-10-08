-- CreateEnum
CREATE TYPE "public"."WhatsappOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."whatsapp_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "totalDistinct" INTEGER NOT NULL,
    "totalEstimated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."WhatsappOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_orders_companyId_phone_createdAt_idx" ON "public"."whatsapp_orders"("companyId", "phone", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."whatsapp_orders" ADD CONSTRAINT "whatsapp_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
