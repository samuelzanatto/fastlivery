-- CreateEnum
CREATE TYPE "public"."SupplierPlanType" AS ENUM ('STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."SupplierSubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING');

-- CreateTable
CREATE TABLE "public"."supplier_subscription_plans" (
    "id" TEXT NOT NULL,
    "planType" "public"."SupplierPlanType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" INTEGER NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "maxProducts" INTEGER,
    "maxPartnerships" INTEGER,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "advancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "apiAccess" BOOLEAN NOT NULL DEFAULT false,
    "whiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "dedicatedManager" BOOLEAN NOT NULL DEFAULT false,
    "customReports" BOOLEAN NOT NULL DEFAULT false,
    "slaGuarantee" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_subscriptions" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" "public"."SupplierSubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "currentProductCount" INTEGER NOT NULL DEFAULT 0,
    "currentPartnershipCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_subscription_plans_stripeProductId_key" ON "public"."supplier_subscription_plans"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_subscription_plans_stripePriceId_key" ON "public"."supplier_subscription_plans"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_subscriptions_supplierId_key" ON "public"."supplier_subscriptions"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_subscriptions_stripeSubscriptionId_key" ON "public"."supplier_subscriptions"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "public"."supplier_subscriptions" ADD CONSTRAINT "supplier_subscriptions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."supplier_subscriptions" ADD CONSTRAINT "supplier_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."supplier_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
