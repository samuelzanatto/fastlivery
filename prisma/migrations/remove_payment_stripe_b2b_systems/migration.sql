-- =====================================================
-- MIGRAÇÃO: Remover sistemas de pagamento e B2B
-- Data: 2025-12-06
-- Descrição: Remove todos os modelos e campos relacionados a:
--   - Stripe (produtos, preços, connect, transações)
--   - MercadoPago
--   - Sistema B2B (Supplier, Company, Marketplace, Partnerships)
--   - WhatsApp B2B (mantém Business/Restaurant WhatsApp se existir)
-- =====================================================

-- ===============================
-- 1. REMOVER TABELAS B2B/WHATSAPP
-- ===============================

-- WhatsApp Cart Items (depende de supplier_services)
DROP TABLE IF EXISTS "whatsapp_cart_items" CASCADE;

-- WhatsApp Order Suppliers (pivot)
DROP TABLE IF EXISTS "whatsapp_order_suppliers" CASCADE;

-- WhatsApp Orders
DROP TABLE IF EXISTS "whatsapp_orders" CASCADE;

-- WhatsApp Messages
DROP TABLE IF EXISTS "whatsapp_messages" CASCADE;

-- WhatsApp Config
DROP TABLE IF EXISTS "whatsapp_configs" CASCADE;

-- ===============================
-- 2. REMOVER TABELAS STRIPE CONNECT
-- ===============================

-- Stripe Connect Transfers
DROP TABLE IF EXISTS "stripe_connect_transfers" CASCADE;

-- Stripe Connect Transactions
DROP TABLE IF EXISTS "stripe_connect_transactions" CASCADE;

-- ===============================
-- 3. REMOVER TABELAS SUPPLIER SUBSCRIPTIONS
-- ===============================

-- Supplier Subscriptions
DROP TABLE IF EXISTS "supplier_subscriptions" CASCADE;

-- Supplier Subscription Plans
DROP TABLE IF EXISTS "supplier_subscription_plans" CASCADE;

-- ===============================
-- 4. REMOVER TABELAS MARKETPLACE
-- ===============================

-- Marketplace Activities
DROP TABLE IF EXISTS "marketplace_activities" CASCADE;

-- Marketplace Favorites
DROP TABLE IF EXISTS "marketplace_favorites" CASCADE;

-- Supplier Clients
DROP TABLE IF EXISTS "supplier_clients" CASCADE;

-- Supplier Reviews
DROP TABLE IF EXISTS "supplier_reviews" CASCADE;

-- Partnership Requests
DROP TABLE IF EXISTS "partnership_requests" CASCADE;

-- Partnerships
DROP TABLE IF EXISTS "partnerships" CASCADE;

-- ===============================
-- 5. REMOVER TABELAS SUPPLIER
-- ===============================

-- Supplier Service Stock Movements
DROP TABLE IF EXISTS "supplier_service_stock_movements" CASCADE;

-- Supplier Service Categories
DROP TABLE IF EXISTS "supplier_service_categories" CASCADE;

-- Supplier Services
DROP TABLE IF EXISTS "supplier_services" CASCADE;

-- Suppliers
DROP TABLE IF EXISTS "suppliers" CASCADE;

-- ===============================
-- 6. REMOVER TABELA COMPANY
-- ===============================

DROP TABLE IF EXISTS "companies" CASCADE;

-- ===============================
-- 7. REMOVER TABELAS STRIPE PRODUCTS
-- ===============================

-- Stripe Prices
DROP TABLE IF EXISTS "stripe_prices" CASCADE;

-- Stripe Products
DROP TABLE IF EXISTS "stripe_products" CASCADE;

-- ===============================
-- 8. REMOVER COLUNAS DE PAGAMENTO
-- ===============================

-- Remover campos MercadoPago do Business
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "mercadoPagoAccessToken";
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "mercadoPagoConfigured";
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "mercadoPagoPublicKey";
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "mercadoPagoRefreshToken";
ALTER TABLE "businesses" DROP COLUMN IF EXISTS "mercadoPagoExpiresAt";

-- Remover campos Stripe do User
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripeCustomerId";

-- Remover campos Stripe do Order
ALTER TABLE "orders" DROP COLUMN IF EXISTS "stripeSessionId";

-- Remover campos Stripe do Payment
ALTER TABLE "payments" DROP COLUMN IF EXISTS "stripePaymentId";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "stripeSessionId";

-- Remover campos Stripe do Subscription
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripeSubscriptionId";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripePriceId";

-- ===============================
-- 9. REMOVER ENUMS NÃO USADOS
-- ===============================

-- Nota: PostgreSQL não permite DROP TYPE IF EXISTS com CASCADE facilmente
-- Removemos após verificar que não há dependências

DROP TYPE IF EXISTS "CompanyType";
DROP TYPE IF EXISTS "StripeConnectStatus";
DROP TYPE IF EXISTS "SupplierCategory";
DROP TYPE IF EXISTS "PartnershipStatus";
DROP TYPE IF EXISTS "PartnershipRequestStatus";
DROP TYPE IF EXISTS "StockMovementType";
DROP TYPE IF EXISTS "StripeTransactionType";
DROP TYPE IF EXISTS "StripeTransactionStatus";
DROP TYPE IF EXISTS "StripeTransferStatus";
DROP TYPE IF EXISTS "SupplierPlanType";
DROP TYPE IF EXISTS "SupplierSubscriptionStatus";
DROP TYPE IF EXISTS "WhatsappStatus";
DROP TYPE IF EXISTS "MessageDirection";
DROP TYPE IF EXISTS "WhatsappOrderStatus";
DROP TYPE IF EXISTS "WhatsappOrderSource";
