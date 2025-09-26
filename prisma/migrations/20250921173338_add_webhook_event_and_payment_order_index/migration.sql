-- CreateTable
CREATE TABLE "public"."webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT,
    "signature" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_provider_externalId_idx" ON "public"."webhook_events"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_externalId_eventType_key" ON "public"."webhook_events"("provider", "externalId", "eventType");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "public"."payments"("orderId");
