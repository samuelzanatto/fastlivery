/*
  Warnings:

  - The values [DELIVERY_BUSINESS] on the enum `CompanyType` will be removed. If these variants are still used in the database, this will fail.
  - The values [RESTAURANT] on the enum `SenderType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `restaurantId` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."CompanyType_new" AS ENUM ('BUSINESS', 'SUPPLIER');
ALTER TABLE "public"."companies" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "public"."companies" ALTER COLUMN "type" TYPE "public"."CompanyType_new" USING ("type"::text::"public"."CompanyType_new");
ALTER TYPE "public"."CompanyType" RENAME TO "CompanyType_old";
ALTER TYPE "public"."CompanyType_new" RENAME TO "CompanyType";
DROP TYPE "public"."CompanyType_old";
ALTER TABLE "public"."companies" ALTER COLUMN "type" SET DEFAULT 'BUSINESS';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."SenderType_new" AS ENUM ('CUSTOMER', 'BUSINESS');
ALTER TABLE "public"."chat_messages" ALTER COLUMN "senderType" TYPE "public"."SenderType_new" USING ("senderType"::text::"public"."SenderType_new");
ALTER TYPE "public"."SenderType" RENAME TO "SenderType_old";
ALTER TYPE "public"."SenderType_new" RENAME TO "SenderType";
DROP TYPE "public"."SenderType_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."companies" ALTER COLUMN "type" SET DEFAULT 'BUSINESS';

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "restaurantId",
ADD COLUMN     "businessId" TEXT;
