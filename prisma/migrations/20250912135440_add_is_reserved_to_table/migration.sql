-- AlterTable
ALTER TABLE "public"."tables" ADD COLUMN     "isReserved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."images" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "category" TEXT,
    "hash" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_entityId_type_idx" ON "public"."images"("entityId", "type");

-- CreateIndex
CREATE INDEX "images_hash_idx" ON "public"."images"("hash");
