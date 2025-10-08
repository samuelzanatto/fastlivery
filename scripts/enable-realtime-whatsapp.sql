-- Habilitação de Realtime para tabelas WhatsApp / Suppliers
-- Rode este script uma única vez no SQL Editor do Supabase (ou via psql) com a role de serviço.
-- Ajuste políticas conforme necessidade de segurança antes de produção.

-- 1. Garante que a publication padrão exista
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'CREATE PUBLICATION supabase_realtime FOR ALL TABLES'; -- (caso queira limitar depois, altere manualmente)
  END IF;
END $$;

-- 2. Adiciona somente as tabelas necessárias à publication (idempotente)
DO $$
DECLARE
  t text;
  target_tables text[] := ARRAY[
    'whatsapp_orders',
    'whatsapp_order_suppliers',
    'whatsapp_messages',
    'whatsapp_cart_items'
  ];
BEGIN
  FOREACH t IN ARRAY target_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
       WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- 3. Replica identity FULL (necessário para updates consistentes em Realtime)
DO $$
DECLARE
  t text;
  ri_tables text[] := ARRAY['whatsapp_orders','whatsapp_order_suppliers','whatsapp_messages'];
BEGIN
  FOREACH t IN ARRAY ri_tables LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;

-- 4. Concessão de privilégios básicos (ajuste conforme seu modelo de segurança)
GRANT SELECT ON TABLE 
  public.whatsapp_orders,
  public.whatsapp_order_suppliers,
  public.whatsapp_messages,
  public.whatsapp_cart_items
TO anon, authenticated;

-- 5. (Opcional) Ativar RLS onde ainda não estiver e criar políticas simples
-- Verifique se já está ativo antes de executar; aqui fazemos idempotente.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='whatsapp_messages') THEN
    RAISE NOTICE 'Tabela whatsapp_messages não encontrada (verifique migrations)';
  END IF;
END $$;

-- Ativar RLS onde quiser restringir (mensagens e cart podem ser sensíveis). Comente se não quiser.
-- ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.whatsapp_cart_items ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura simples (substitua depois por regras mais específicas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_orders' AND policyname='Authenticated read whatsapp_orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated read whatsapp_orders" ON public.whatsapp_orders FOR SELECT USING (auth.role() = ''authenticated'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_order_suppliers' AND policyname='Authenticated read whatsapp_order_suppliers'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated read whatsapp_order_suppliers" ON public.whatsapp_order_suppliers FOR SELECT USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- 6. (Opcional) Política para mensagens (se ativar RLS)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_messages' AND policyname='Authenticated read whatsapp_messages'
--   ) THEN
--     EXECUTE 'CREATE POLICY "Authenticated read whatsapp_messages" ON public.whatsapp_messages FOR SELECT USING (auth.role() = ''authenticated'')';
--   END IF;
-- END $$;

-- 7. Verificação final
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename LIKE 'whatsapp_%' ORDER BY tablename;