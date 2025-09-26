/*
  Warnings:

  - You are about to drop the column `restaurantId` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `employee_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `tables` table. All the data in the column will be lost.
  - You are about to drop the `restaurant_additional_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `restaurant_additionals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `restaurants` table. If the table is not empty, all the data it contains will be lost.

*/

-- Step 1: Create new businesses table
CREATE TABLE "public"."businesses" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "avatar" TEXT,
    "banner" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openingHours" TEXT,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryTime" INTEGER NOT NULL DEFAULT 30,
    "acceptsDelivery" BOOLEAN NOT NULL DEFAULT true,
    "acceptsPickup" BOOLEAN NOT NULL DEFAULT true,
    "acceptsDineIn" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,
    "slug" TEXT,
    "mercadoPagoAccessToken" TEXT,
    "mercadoPagoConfigured" BOOLEAN NOT NULL DEFAULT false,
    "mercadoPagoPublicKey" TEXT,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create new business_additionals table
CREATE TABLE "public"."business_additionals" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxOptions" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_additionals_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create new business_additional_items table
CREATE TABLE "public"."business_additional_items" (
    "id" TEXT NOT NULL,
    "additionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_additional_items_pkey" PRIMARY KEY ("id")
);

-- Step 4: Copy data from restaurants to businesses
INSERT INTO "public"."businesses" (
    "id", "email", "password", "name", "description", "phone", "address", 
    "avatar", "banner", "isOpen", "openingHours", "deliveryFee", "minimumOrder", 
    "deliveryTime", "acceptsDelivery", "acceptsPickup", "acceptsDineIn", 
    "isActive", "subscriptionExpiresAt", "createdAt", "updatedAt", "ownerId", 
    "slug", "mercadoPagoAccessToken", "mercadoPagoConfigured", "mercadoPagoPublicKey"
)
SELECT 
    "id", "email", "password", "name", "description", "phone", "address", 
    "avatar", "banner", "isOpen", "openingHours", "deliveryFee", "minimumOrder", 
    "deliveryTime", "acceptsDelivery", "acceptsPickup", "acceptsDineIn", 
    "isActive", "subscriptionExpiresAt", "createdAt", "updatedAt", "ownerId", 
    "slug", "mercadoPagoAccessToken", "mercadoPagoConfigured", "mercadoPagoPublicKey"
FROM "public"."restaurants";

-- Step 5: Copy data from restaurant_additionals to business_additionals
INSERT INTO "public"."business_additionals" (
    "id", "businessId", "name", "description", "price", "isRequired", "maxOptions", "createdAt", "updatedAt"
)
SELECT 
    "id", "restaurantId", "name", "description", "price", "isRequired", "maxOptions", "createdAt", "updatedAt"
FROM "public"."restaurant_additionals";

-- Step 6: Copy data from restaurant_additional_items to business_additional_items
INSERT INTO "public"."business_additional_items" (
    "id", "additionalId", "name", "price", "createdAt", "updatedAt"
)
SELECT 
    "id", "additionalId", "name", "price", "createdAt", "updatedAt"
FROM "public"."restaurant_additional_items";

-- Step 7: Add businessId columns with data from restaurantId
ALTER TABLE "public"."categories" ADD COLUMN "businessId" TEXT;
UPDATE "public"."categories" SET "businessId" = "restaurantId";
ALTER TABLE "public"."categories" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."conversations" ADD COLUMN "businessId" TEXT;
UPDATE "public"."conversations" SET "businessId" = "restaurantId";
ALTER TABLE "public"."conversations" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."employee_profiles" ADD COLUMN "businessId" TEXT;
UPDATE "public"."employee_profiles" SET "businessId" = "restaurantId";
ALTER TABLE "public"."employee_profiles" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."orders" ADD COLUMN "businessId" TEXT;
UPDATE "public"."orders" SET "businessId" = "restaurantId";
ALTER TABLE "public"."orders" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."payments" ADD COLUMN "businessId" TEXT;
UPDATE "public"."payments" SET "businessId" = "restaurantId";
ALTER TABLE "public"."payments" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."products" ADD COLUMN "businessId" TEXT;
UPDATE "public"."products" SET "businessId" = "restaurantId";
ALTER TABLE "public"."products" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."promotions" ADD COLUMN "businessId" TEXT;
UPDATE "public"."promotions" SET "businessId" = "restaurantId";
ALTER TABLE "public"."promotions" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."roles" ADD COLUMN "businessId" TEXT;
UPDATE "public"."roles" SET "businessId" = "restaurantId";
ALTER TABLE "public"."roles" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."subscriptions" ADD COLUMN "businessId" TEXT;
UPDATE "public"."subscriptions" SET "businessId" = "restaurantId";
ALTER TABLE "public"."subscriptions" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "public"."tables" ADD COLUMN "businessId" TEXT;
UPDATE "public"."tables" SET "businessId" = "restaurantId";
ALTER TABLE "public"."tables" ALTER COLUMN "businessId" SET NOT NULL;

-- Step 8: Drop foreign key constraints and old columns
ALTER TABLE "public"."categories" DROP CONSTRAINT "categories_restaurantId_fkey";
ALTER TABLE "public"."conversations" DROP CONSTRAINT "conversations_restaurantId_fkey";
ALTER TABLE "public"."employee_profiles" DROP CONSTRAINT "employee_profiles_restaurantId_fkey";
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_restaurantId_fkey";
ALTER TABLE "public"."payments" DROP CONSTRAINT "payments_restaurantId_fkey";
ALTER TABLE "public"."product_additionals" DROP CONSTRAINT "product_additionals_additionalId_fkey";
ALTER TABLE "public"."products" DROP CONSTRAINT "products_restaurantId_fkey";
ALTER TABLE "public"."promotions" DROP CONSTRAINT "promotions_restaurantId_fkey";
ALTER TABLE "public"."restaurant_additional_items" DROP CONSTRAINT "restaurant_additional_items_additionalId_fkey";
ALTER TABLE "public"."restaurant_additionals" DROP CONSTRAINT "restaurant_additionals_restaurantId_fkey";
ALTER TABLE "public"."restaurants" DROP CONSTRAINT "restaurants_ownerId_fkey";
ALTER TABLE "public"."roles" DROP CONSTRAINT "roles_restaurantId_fkey";
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_restaurantId_fkey";
ALTER TABLE "public"."tables" DROP CONSTRAINT "tables_restaurantId_fkey";

-- Step 9: Drop old indexes
DROP INDEX "public"."categories_restaurantId_name_key";
DROP INDEX "public"."conversations_customerId_restaurantId_key";
DROP INDEX "public"."employee_profiles_userId_restaurantId_key";
DROP INDEX "public"."products_restaurantId_name_key";
DROP INDEX "public"."roles_restaurantId_name_key";
DROP INDEX "public"."subscriptions_restaurantId_key";

-- Step 10: Drop old columns
ALTER TABLE "public"."categories" DROP COLUMN "restaurantId";
ALTER TABLE "public"."conversations" DROP COLUMN "restaurantId";
ALTER TABLE "public"."employee_profiles" DROP COLUMN "restaurantId";
ALTER TABLE "public"."orders" DROP COLUMN "restaurantId";
ALTER TABLE "public"."payments" DROP COLUMN "restaurantId";
ALTER TABLE "public"."products" DROP COLUMN "restaurantId";
ALTER TABLE "public"."promotions" DROP COLUMN "restaurantId";
ALTER TABLE "public"."roles" DROP COLUMN "restaurantId";
ALTER TABLE "public"."subscriptions" DROP COLUMN "restaurantId";
ALTER TABLE "public"."tables" DROP COLUMN "restaurantId";

-- Step 11: Drop old tables
DROP TABLE "public"."restaurant_additional_items";
DROP TABLE "public"."restaurant_additionals";
DROP TABLE "public"."restaurants";

-- Step 12: Create new indexes and constraints
CREATE UNIQUE INDEX "businesses_email_key" ON "public"."businesses"("email");
CREATE UNIQUE INDEX "categories_businessId_name_key" ON "public"."categories"("businessId", "name");
CREATE UNIQUE INDEX "conversations_customerId_businessId_key" ON "public"."conversations"("customerId", "businessId");
CREATE UNIQUE INDEX "employee_profiles_userId_businessId_key" ON "public"."employee_profiles"("userId", "businessId");
CREATE UNIQUE INDEX "products_businessId_name_key" ON "public"."products"("businessId", "name");
CREATE UNIQUE INDEX "roles_businessId_name_key" ON "public"."roles"("businessId", "name");
CREATE UNIQUE INDEX "subscriptions_businessId_key" ON "public"."subscriptions"("businessId");

-- Step 13: Add foreign keys
ALTER TABLE "public"."businesses" ADD CONSTRAINT "businesses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."products" ADD CONSTRAINT "products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."business_additionals" ADD CONSTRAINT "business_additionals_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."business_additional_items" ADD CONSTRAINT "business_additional_items_additionalId_fkey" FOREIGN KEY ("additionalId") REFERENCES "public"."business_additionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_additionals" ADD CONSTRAINT "product_additionals_additionalId_fkey" FOREIGN KEY ("additionalId") REFERENCES "public"."business_additionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."tables" ADD CONSTRAINT "tables_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."promotions" ADD CONSTRAINT "promotions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."employee_profiles" ADD CONSTRAINT "employee_profiles_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;