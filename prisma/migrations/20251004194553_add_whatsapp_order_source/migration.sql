-- CreateEnum
CREATE TYPE "public"."WhatsappOrderSource" AS ENUM ('WHATSAPP', 'PLATFORM');

-- AlterTable
ALTER TABLE "public"."whatsapp_orders" ADD COLUMN     "source" "public"."WhatsappOrderSource" NOT NULL DEFAULT 'WHATSAPP';
