-- AlterTable
ALTER TABLE "public"."businesses" ADD COLUMN     "mercadoPagoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "mercadoPagoRefreshToken" TEXT;
