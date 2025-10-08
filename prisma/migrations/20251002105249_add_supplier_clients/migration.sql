-- CreateTable
CREATE TABLE "public"."supplier_clients" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_clients_supplierId_phone_key" ON "public"."supplier_clients"("supplierId", "phone");

-- AddForeignKey
ALTER TABLE "public"."supplier_clients" ADD CONSTRAINT "supplier_clients_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
