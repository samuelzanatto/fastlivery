-- AlterTable
ALTER TABLE "public"."supplier_services" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "public"."supplier_service_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_service_categories_companyId_order_idx" ON "public"."supplier_service_categories"("companyId", "order");

-- AddForeignKey
ALTER TABLE "public"."supplier_services" ADD CONSTRAINT "supplier_services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."supplier_service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."supplier_service_categories" ADD CONSTRAINT "supplier_service_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."supplier_service_categories" ADD CONSTRAINT "supplier_service_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."supplier_service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
