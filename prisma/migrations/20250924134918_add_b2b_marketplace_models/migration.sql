/*
  Warnings:

  - Made the column `metadata` on table `marketplace_activities` required. This step will fail if there are existing NULL values in that column.
  - Made the column `serviceIds` on table `partnership_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contractTerms` on table `partnerships` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discount` on table `partnerships` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isAutoRenewal` on table `partnerships` required. This step will fail if there are existing NULL values in that column.
  - Made the column `aspects` on table `supplier_reviews` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isVerified` on table `supplier_reviews` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isAnonymous` on table `supplier_reviews` required. This step will fail if there are existing NULL values in that column.
  - Made the column `priceType` on table `supplier_services` required. This step will fail if there are existing NULL values in that column.
  - Made the column `images` on table `supplier_services` required. This step will fail if there are existing NULL values in that column.
  - Made the column `specifications` on table `supplier_services` required. This step will fail if there are existing NULL values in that column.
  - Made the column `certifications` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `serviceAreas` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deliveryMethods` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `responseTime` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rating` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalReviews` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalOrders` on table `suppliers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."companies_city_state_idx";

-- DropIndex
DROP INDEX "public"."companies_type_isActive_idx";

-- DropIndex
DROP INDEX "public"."marketplace_activities_type_createdAt_idx";

-- DropIndex
DROP INDEX "public"."partnership_requests_status_idx";

-- DropIndex
DROP INDEX "public"."partnerships_status_idx";

-- DropIndex
DROP INDEX "public"."supplier_services_supplierId_isActive_idx";

-- DropIndex
DROP INDEX "public"."suppliers_category_isActive_idx";

-- DropIndex
DROP INDEX "public"."suppliers_rating_idx";

-- AlterTable
ALTER TABLE "public"."marketplace_activities" ALTER COLUMN "metadata" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."partnership_requests" ALTER COLUMN "serviceIds" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."partnerships" ALTER COLUMN "contractTerms" SET NOT NULL,
ALTER COLUMN "discount" SET NOT NULL,
ALTER COLUMN "isAutoRenewal" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."supplier_reviews" ALTER COLUMN "aspects" SET NOT NULL,
ALTER COLUMN "isVerified" SET NOT NULL,
ALTER COLUMN "isAnonymous" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."supplier_services" ALTER COLUMN "priceType" SET NOT NULL,
ALTER COLUMN "images" SET NOT NULL,
ALTER COLUMN "specifications" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."suppliers" ALTER COLUMN "certifications" SET NOT NULL,
ALTER COLUMN "serviceAreas" SET NOT NULL,
ALTER COLUMN "deliveryMethods" SET NOT NULL,
ALTER COLUMN "responseTime" SET NOT NULL,
ALTER COLUMN "rating" SET NOT NULL,
ALTER COLUMN "totalReviews" SET NOT NULL,
ALTER COLUMN "totalOrders" SET NOT NULL;
