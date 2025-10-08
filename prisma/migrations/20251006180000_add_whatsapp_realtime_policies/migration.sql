-- RLS Policies para permitir Realtime (SELECT) e replicação
-- Pré-requisitos: EXTENSÃO pgcrypto já disponível em Supabase padrão
-- Estratégia: liberar SELECT para role authenticated nas tabelas necessárias
-- Ajuste depois para filtros mais específicos (ex: supplier vinculado)

-- Ativar RLS (se ainda não ativo)
ALTER TABLE public.whatsapp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_order_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_services ENABLE ROW LEVEL SECURITY;

-- Remover policies duplicadas se existirem (safe guard)
DROP POLICY IF EXISTS "whatsapp_orders_select" ON public.whatsapp_orders;
DROP POLICY IF EXISTS "whatsapp_order_suppliers_select" ON public.whatsapp_order_suppliers;
DROP POLICY IF EXISTS "supplier_services_select" ON public.supplier_services;

-- Policy ampla inicial (refinar depois com subclaims ou join em suppliers)
CREATE POLICY "whatsapp_orders_select" ON public.whatsapp_orders
  FOR SELECT USING ( true );

CREATE POLICY "whatsapp_order_suppliers_select" ON public.whatsapp_order_suppliers
  FOR SELECT USING ( true );

CREATE POLICY "supplier_services_select" ON public.supplier_services
  FOR SELECT USING ( true );

-- Observação: Realtime usa as policies de SELECT para filtrar payload.
-- Como ainda vamos restringir por supplierId, esta abertura é temporária para eliminar 401.
-- Próxima etapa: substituir true por EXISTS query que valide vínculo do supplier.
