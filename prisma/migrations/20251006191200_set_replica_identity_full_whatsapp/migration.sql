-- Garantir que Realtime tenha acesso ao conteúdo completo dos registros novos/antigos
-- Isso ajuda a depurar (evita new/old vazios quando autorizado) e permite UPDATE com old record.
-- Obs: Pode aumentar volume de WAL. Reavaliar depois de estabilizar.

BEGIN;
ALTER TABLE public.whatsapp_orders REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_order_suppliers REPLICA IDENTITY FULL;
ALTER TABLE public.supplier_services REPLICA IDENTITY FULL;
COMMIT;
