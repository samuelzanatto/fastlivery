/*
  Warnings:

  - A unique constraint covering the columns `[stripeConnectAccountId]` on the table `suppliers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."StripeConnectStatus" AS ENUM ('NOT_CONNECTED', 'PENDING', 'CONNECTED', 'RESTRICTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."StripeTransactionType" AS ENUM ('PAYMENT', 'REFUND', 'ADJUSTMENT', 'PAYOUT');

-- CreateEnum
CREATE TYPE "public"."StripeTransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."StripeTransferStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED', 'IN_TRANSIT');

-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "platformCommissionRate" DOUBLE PRECISION DEFAULT 5.0,
ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeConnectChargesEnabled" BOOLEAN DEFAULT false,
ADD COLUMN     "stripeConnectOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "stripeConnectPayoutsEnabled" BOOLEAN DEFAULT false,
ADD COLUMN     "stripeConnectStatus" "public"."StripeConnectStatus" DEFAULT 'NOT_CONNECTED';

-- AlterTable
ALTER TABLE "public"."suppliers" ADD COLUMN     "stripeConnectAccountId" TEXT;

-- CreateTable
CREATE TABLE "public"."stripe_connect_transactions" (
    "id" TEXT NOT NULL,
    "stripeTransactionId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "platformStripeAccountId" TEXT,
    "type" "public"."StripeTransactionType" NOT NULL,
    "status" "public"."StripeTransactionStatus" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'brl',
    "platformCommission" INTEGER NOT NULL,
    "supplierAmount" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "stripeCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_connect_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stripe_connect_transfers" (
    "id" TEXT NOT NULL,
    "stripeTransferId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'brl',
    "status" "public"."StripeTransferStatus" NOT NULL,
    "description" TEXT,
    "stripeCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_connect_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_connect_transactions_stripeTransactionId_key" ON "public"."stripe_connect_transactions"("stripeTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_connect_transfers_stripeTransferId_key" ON "public"."stripe_connect_transfers"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_stripeConnectAccountId_key" ON "public"."suppliers"("stripeConnectAccountId");

-- AddForeignKey
ALTER TABLE "public"."stripe_connect_transactions" ADD CONSTRAINT "stripe_connect_transactions_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "public"."suppliers"("stripeConnectAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stripe_connect_transfers" ADD CONSTRAINT "stripe_connect_transfers_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."stripe_connect_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stripe_connect_transfers" ADD CONSTRAINT "stripe_connect_transfers_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "public"."suppliers"("stripeConnectAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;
