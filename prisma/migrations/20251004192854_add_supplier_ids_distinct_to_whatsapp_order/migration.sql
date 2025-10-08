-- AlterTable
ALTER TABLE "public"."whatsapp_orders" ADD COLUMN     "supplierIdsDistinct" TEXT[] DEFAULT ARRAY[]::TEXT[];
