-- CreateEnum
CREATE TYPE "public"."MessageDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "public"."whatsapp_messages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "direction" "public"."MessageDirection" NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "intentConfidence" DOUBLE PRECISION,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_cart_items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_messages_companyId_phone_createdAt_idx" ON "public"."whatsapp_messages"("companyId", "phone", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_cart_items_companyId_phone_idx" ON "public"."whatsapp_cart_items"("companyId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_cart_items_companyId_phone_serviceId_key" ON "public"."whatsapp_cart_items"("companyId", "phone", "serviceId");

-- AddForeignKey
ALTER TABLE "public"."whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_cart_items" ADD CONSTRAINT "whatsapp_cart_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_cart_items" ADD CONSTRAINT "whatsapp_cart_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."supplier_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
