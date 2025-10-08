-- CreateTable
CREATE TABLE "public"."whatsapp_order_suppliers" (
    "orderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_order_suppliers_pkey" PRIMARY KEY ("orderId","supplierId")
);

-- CreateIndex
CREATE INDEX "whatsapp_order_suppliers_supplierId_idx" ON "public"."whatsapp_order_suppliers"("supplierId");

-- AddForeignKey
ALTER TABLE "public"."whatsapp_order_suppliers" ADD CONSTRAINT "whatsapp_order_suppliers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."whatsapp_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_order_suppliers" ADD CONSTRAINT "whatsapp_order_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
