-- CreateTable
CREATE TABLE "public"."product_additionals" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "additionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_additionals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_additionals_productId_additionalId_key" ON "public"."product_additionals"("productId", "additionalId");

-- AddForeignKey
ALTER TABLE "public"."product_additionals" ADD CONSTRAINT "product_additionals_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_additionals" ADD CONSTRAINT "product_additionals_additionalId_fkey" FOREIGN KEY ("additionalId") REFERENCES "public"."restaurant_additionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
