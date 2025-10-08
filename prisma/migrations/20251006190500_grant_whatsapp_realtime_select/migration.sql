-- Grant SELECT explícito para roles anon e authenticated nas tabelas usadas pelo Realtime
-- Motivo: Mesmo com policies RLS USING (true), o Realtime pode retornar 401 se o papel
-- não tiver privilégio base de SELECT (GRANT) além da policy. Garantimos ambos.
-- Depois, quando policies forem refinadas, estes GRANTs permanecem necessários.

BEGIN;

GRANT SELECT ON TABLE public.whatsapp_orders TO anon, authenticated;
GRANT SELECT ON TABLE public.whatsapp_order_suppliers TO anon, authenticated;
GRANT SELECT ON TABLE public.supplier_services TO anon, authenticated;

COMMIT;
