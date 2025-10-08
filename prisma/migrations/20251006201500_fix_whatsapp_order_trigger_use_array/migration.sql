-- Refactor broadcast_whatsapp_order_changes to avoid joining pivot during INSERT
-- Instead, iterate over NEW."supplierIdsDistinct" directly (safer, no race)

CREATE OR REPLACE FUNCTION public.broadcast_whatsapp_order_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sid text;
  channel_name text;
  message_payload jsonb;
  is_update boolean := (TG_OP = 'UPDATE');
  supplier_ids text[];
BEGIN
  supplier_ids := COALESCE(NEW."supplierIdsDistinct", OLD."supplierIdsDistinct");
  IF supplier_ids IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOREACH sid IN ARRAY supplier_ids LOOP
    channel_name := 'supplier-whatsapp-orders:' || sid;

    IF TG_OP = 'INSERT' THEN
      message_payload := jsonb_build_object(
        'id', uuid_generate_v4()::text,
        'type', 'whatsapp_order_created',
        'timestamp', extract(epoch from now())::text,
        'supplierId', sid,
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
        'supplierId', sid,
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
  RETURN COALESCE(NEW, OLD);
END;
$$;