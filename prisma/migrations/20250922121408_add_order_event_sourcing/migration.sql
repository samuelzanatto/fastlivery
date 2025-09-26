-- CreateTable
CREATE TABLE "public"."order_event_ingestion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_event_ingestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_history" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventIngestionId" TEXT,
    "fromStatus" "public"."OrderStatus",
    "toStatus" "public"."OrderStatus",
    "transitionType" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_event_ingestion_orderId_idx" ON "public"."order_event_ingestion"("orderId");

-- CreateIndex
CREATE INDEX "order_event_ingestion_orderNumber_idx" ON "public"."order_event_ingestion"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "order_event_ingestion_eventId_key" ON "public"."order_event_ingestion"("eventId");

-- CreateIndex
CREATE INDEX "order_history_orderId_idx" ON "public"."order_history"("orderId");

-- CreateIndex
CREATE INDEX "order_history_eventIngestionId_idx" ON "public"."order_history"("eventIngestionId");

-- AddForeignKey
ALTER TABLE "public"."order_event_ingestion" ADD CONSTRAINT "order_event_ingestion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_history" ADD CONSTRAINT "order_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_history" ADD CONSTRAINT "order_history_eventIngestionId_fkey" FOREIGN KEY ("eventIngestionId") REFERENCES "public"."order_event_ingestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
