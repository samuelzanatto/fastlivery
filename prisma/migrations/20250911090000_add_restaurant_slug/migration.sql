-- Add slug column to restaurants if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'restaurants'
      AND column_name = 'slug'
  ) THEN
    ALTER TABLE "restaurants" ADD COLUMN "slug" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "restaurants_slug_key" ON "restaurants"("slug") WHERE "slug" IS NOT NULL;
  END IF;
END $$;
