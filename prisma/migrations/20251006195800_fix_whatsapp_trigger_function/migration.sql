-- Fix broadcast_whatsapp_order_changes function with quoted identifiers
-- and guard clauses; idempotent replacement.

CREATE OR REPLACE FUNCTION public.broadcast_whatsapp_order_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supplier_record record;
  channel_name text;
  message_payload jsonb;
BEGIN
  -- Loop each supplier related to the order via pivot
  FOR supplier_record IN
    SELECT DISTINCT wos."supplierId"
    FROM public."whatsapp_order_suppliers" wos
    WHERE wos."orderId" = coalesce(NEW.id, OLD.id)
  LOOP
    channel_name := 'supplier-whatsapp-orders:' || supplier_record."supplierId";

    IF TG_OP = 'INSERT' THEN
      message_payload := jsonb_build_object(
        'id', uuid_generate_v4()::text,
        'type', 'whatsapp_order_created',
        'timestamp', extract(epoch from now())::text,
        'supplierId', supplier_record."supplierId",
        'orderId', NEW.id,
        'payload', jsonb_build_object(
          'id', NEW.id,
          'phone', NEW.phone,
          'companyId', NEW."companyId",
          'supplierIds', NEW."supplierIdsDistinct",
          'items', NEW.items,
          'totalEstimated', NEW."totalEstimated",
          'status', NEW.status,
          'createdAt', NEW."createdAt"
        )
      );
    ELSIF TG_OP = 'UPDATE' THEN
      message_payload := jsonb_build_object(
        'id', uuid_generate_v4()::text,
        'type', 'whatsapp_order_updated',
        'timestamp', extract(epoch from now())::text,
        'supplierId', supplier_record."supplierId",
        'orderId', NEW.id,
        'payload', jsonb_build_object(
          'id', NEW.id,
          'phone', NEW.phone,
          'companyId', NEW."companyId",
          'supplierIds', NEW."supplierIdsDistinct",
          'items', NEW.items,
          'totalEstimated', NEW."totalEstimated",
          'status', NEW.status,
          'createdAt', NEW."createdAt"
        )
      );
    END IF;

    PERFORM public.send_realtime_message(channel_name, message_payload->>'type', message_payload);
  END LOOP;
  RETURN coalesce(NEW, OLD);
END;
$$;
