-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userId" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(6),

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSession" (
    "deviceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "businessSlug" TEXT NOT NULL,
    "tableNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("deviceId")
);

-- CreateIndex
CREATE INDEX "idx_push_subscriptions_business" ON "push_subscriptions"("businessId");

-- CreateIndex
CREATE INDEX "idx_push_subscriptions_user" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_endpoint_per_business" ON "push_subscriptions"("businessId", "endpoint");

-- CreateIndex
CREATE INDEX "ClientSession_orderId_idx" ON "ClientSession"("orderId");

-- CreateIndex
CREATE INDEX "ClientSession_businessSlug_idx" ON "ClientSession"("businessSlug");

-- CreateIndex
CREATE INDEX "ClientSession_expiresAt_idx" ON "ClientSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
