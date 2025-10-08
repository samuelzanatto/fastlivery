-- CreateEnum
CREATE TYPE "public"."WhatsappStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "public"."whatsapp_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "status" "public"."WhatsappStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "qrCode" TEXT,
    "lastConnected" TIMESTAMP(3),
    "botEnabled" BOOLEAN NOT NULL DEFAULT false,
    "botPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_configs_companyId_key" ON "public"."whatsapp_configs"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_configs_instanceName_key" ON "public"."whatsapp_configs"("instanceName");

-- AddForeignKey
ALTER TABLE "public"."whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
