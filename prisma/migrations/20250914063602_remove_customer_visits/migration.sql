/*
  Warnings:

  - You are about to drop the `customer_visits` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."customer_visits" DROP CONSTRAINT "customer_visits_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."customer_visits" DROP CONSTRAINT "customer_visits_restaurantId_fkey";

-- DropTable
DROP TABLE "public"."customer_visits";
