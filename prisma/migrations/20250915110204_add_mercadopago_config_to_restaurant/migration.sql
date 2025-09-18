-- AlterTable
ALTER TABLE "public"."restaurants" ADD COLUMN     "mercadoPagoAccessToken" TEXT,
ADD COLUMN     "mercadoPagoConfigured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mercadoPagoPublicKey" TEXT;
