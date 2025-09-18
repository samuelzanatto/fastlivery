-- Fix: ensure restaurants.slug exists with unique index
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "restaurants_slug_key" ON "restaurants"("slug") WHERE "slug" IS NOT NULL;
