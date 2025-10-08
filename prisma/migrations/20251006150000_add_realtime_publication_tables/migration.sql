-- Add supplier related whatsapp tables to supabase_realtime publication
-- This is safe to run repeatedly (IF NOT EXISTS guards)
DO $$
BEGIN
  -- Ensure publication exists (Supabase creates supabase_realtime by default)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  -- Add tables if not already part of publication
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_orders';
  EXCEPTION WHEN duplicate_object THEN
    -- ignore
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_order_suppliers';
  EXCEPTION WHEN duplicate_object THEN
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_services';
  EXCEPTION WHEN duplicate_object THEN
  END;
END $$;
