-- CreateTable
CREATE TABLE "public"."stripe_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created" TIMESTAMP(3) NOT NULL,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stripe_prices" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL,
    "unitAmount" INTEGER,
    "recurring" JSONB,
    "type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created" TIMESTAMP(3) NOT NULL,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_prices_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."stripe_prices" ADD CONSTRAINT "stripe_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."stripe_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
