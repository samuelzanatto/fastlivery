-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('DELIVERY_BUSINESS', 'SUPPLIER');
CREATE TYPE "SupplierCategory" AS ENUM ('FOOD_INGREDIENTS', 'PACKAGING', 'EQUIPMENT', 'SERVICES', 'MARKETING', 'LOGISTICS', 'TECHNOLOGY', 'CONSULTING', 'OTHER');
CREATE TYPE "PartnershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');
CREATE TYPE "PartnershipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- ================================
-- B2B MARKETPLACE MODELS
-- ================================

-- Company model (successor to Restaurant)
-- Mais genérico para suportar diferentes tipos de negócio
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "type" "CompanyType" NOT NULL DEFAULT 'DELIVERY_BUSINESS',
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'BR',
    "zipCode" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "banner" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,
    
    -- Campos específicos para empresas de delivery (mantém compatibilidade)
    "isOpen" BOOLEAN DEFAULT true,
    "openingHours" TEXT,
    "deliveryFee" DOUBLE PRECISION DEFAULT 0,
    "minimumOrder" DOUBLE PRECISION DEFAULT 0,
    "deliveryTime" INTEGER DEFAULT 30,
    "acceptsDelivery" BOOLEAN DEFAULT true,
    "acceptsPickup" BOOLEAN DEFAULT true,
    "acceptsDineIn" BOOLEAN DEFAULT true,
    "subscriptionExpiresAt" TIMESTAMP(3),
    "mercadoPagoAccessToken" TEXT,
    "mercadoPagoConfigured" BOOLEAN DEFAULT false,
    "mercadoPagoPublicKey" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Supplier model (fornecedores no marketplace B2B)
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" "SupplierCategory" NOT NULL,
    "subCategory" TEXT,
    "businessModel" TEXT, -- B2B, B2C, Both
    "yearsInBusiness" INTEGER,
    "employeeCount" TEXT, -- "1-10", "11-50", "51-200", "200+"
    "certifications" JSONB DEFAULT '[]',
    "serviceAreas" JSONB DEFAULT '[]', -- ["SP", "RJ", "MG"] ou ["Nacional", "Internacional"]
    "minOrderValue" DOUBLE PRECISION,
    "maxOrderValue" DOUBLE PRECISION,
    "paymentTerms" TEXT,
    "deliveryMethods" JSONB DEFAULT '[]',
    "averageDeliveryTime" INTEGER, -- em dias
    "responseTime" INTEGER DEFAULT 24, -- horas para responder cotações
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "totalReviews" INTEGER DEFAULT 0,
    "totalOrders" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- SupplierService model (produtos/serviços oferecidos pelos fornecedores)
CREATE TABLE "supplier_services" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "unitType" TEXT NOT NULL, -- "kg", "unidade", "litro", "hora", "projeto"
    "minQuantity" DOUBLE PRECISION,
    "maxQuantity" DOUBLE PRECISION,
    "pricePerUnit" DOUBLE PRECISION,
    "priceType" TEXT DEFAULT 'fixed', -- "fixed", "negotiable", "quote"
    "images" JSONB DEFAULT '[]',
    "specifications" JSONB DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_services_pkey" PRIMARY KEY ("id")
);

-- Partnership model (relacionamento entre empresas e fornecedores)
CREATE TABLE "partnerships" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "contractTerms" JSONB DEFAULT '{}',
    "paymentTerms" TEXT,
    "discount" DOUBLE PRECISION DEFAULT 0,
    "minimumOrder" DOUBLE PRECISION,
    "isAutoRenewal" BOOLEAN DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "partnerships_pkey" PRIMARY KEY ("id")
);

-- PartnershipRequest model (solicitações de parceria)
CREATE TABLE "partnership_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL, -- usuário que fez a solicitação
    "status" "PartnershipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "response" TEXT,
    "serviceIds" JSONB DEFAULT '[]', -- IDs dos serviços de interesse
    "expectedVolume" TEXT,
    "budget" DOUBLE PRECISION,
    "timeline" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partnership_requests_pkey" PRIMARY KEY ("id")
);

-- SupplierReview model (avaliações dos fornecedores)
CREATE TABLE "supplier_reviews" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnershipId" TEXT,
    "rating" INTEGER NOT NULL, -- 1 a 5
    "title" TEXT,
    "comment" TEXT,
    "aspects" JSONB DEFAULT '{}', -- {"quality": 5, "delivery": 4, "support": 5, "price": 4}
    "isVerified" BOOLEAN DEFAULT false, -- se foi de uma parceria real
    "isAnonymous" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_reviews_pkey" PRIMARY KEY ("id")
);

-- MarketplaceFavorite model (empresas que favoritaram fornecedores)
CREATE TABLE "marketplace_favorites" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_favorites_pkey" PRIMARY KEY ("id")
);

-- MarketplaceActivity model (atividades do marketplace para analytics)
CREATE TABLE "marketplace_activities" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- "view", "contact", "favorite", "request_partnership", "quote_request"
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "supplierId" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_activities_pkey" PRIMARY KEY ("id")
);

-- ================================
-- INDICES E CONSTRAINTS
-- ================================

-- Unique constraints
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email");
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE UNIQUE INDEX "suppliers_companyId_key" ON "suppliers"("companyId");
CREATE UNIQUE INDEX "partnerships_companyId_supplierId_key" ON "partnerships"("companyId", "supplierId");
CREATE UNIQUE INDEX "marketplace_favorites_companyId_supplierId_key" ON "marketplace_favorites"("companyId", "supplierId");
CREATE UNIQUE INDEX "supplier_reviews_supplierId_companyId_key" ON "supplier_reviews"("supplierId", "companyId");

-- Performance indices
CREATE INDEX "companies_type_isActive_idx" ON "companies"("type", "isActive");
CREATE INDEX "companies_city_state_idx" ON "companies"("city", "state");
CREATE INDEX "suppliers_category_isActive_idx" ON "suppliers"("category", "isActive");
CREATE INDEX "suppliers_rating_idx" ON "suppliers"("rating" DESC);
CREATE INDEX "supplier_services_supplierId_isActive_idx" ON "supplier_services"("supplierId", "isActive");
CREATE INDEX "partnerships_status_idx" ON "partnerships"("status");
CREATE INDEX "partnership_requests_status_idx" ON "partnership_requests"("status");
CREATE INDEX "marketplace_activities_type_createdAt_idx" ON "marketplace_activities"("type", "createdAt");

-- ================================
-- FOREIGN KEYS
-- ================================

-- Companies
ALTER TABLE "companies" ADD CONSTRAINT "companies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Suppliers
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supplier Services
ALTER TABLE "supplier_services" ADD CONSTRAINT "supplier_services_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partnerships
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partnership Requests  
ALTER TABLE "partnership_requests" ADD CONSTRAINT "partnership_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partnership_requests" ADD CONSTRAINT "partnership_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partnership_requests" ADD CONSTRAINT "partnership_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partnership_requests" ADD CONSTRAINT "partnership_requests_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supplier Reviews
ALTER TABLE "supplier_reviews" ADD CONSTRAINT "supplier_reviews_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_reviews" ADD CONSTRAINT "supplier_reviews_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_reviews" ADD CONSTRAINT "supplier_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_reviews" ADD CONSTRAINT "supplier_reviews_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "partnerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Marketplace Favorites
ALTER TABLE "marketplace_favorites" ADD CONSTRAINT "marketplace_favorites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_favorites" ADD CONSTRAINT "marketplace_favorites_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_favorites" ADD CONSTRAINT "marketplace_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Marketplace Activities
ALTER TABLE "marketplace_activities" ADD CONSTRAINT "marketplace_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_activities" ADD CONSTRAINT "marketplace_activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marketplace_activities" ADD CONSTRAINT "marketplace_activities_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ================================
-- MIGRAÇÃO DE DADOS EXISTENTES
-- ================================

-- Migrar dados de restaurants para companies (mantendo compatibilidade)
INSERT INTO "companies" (
    "id", "type", "email", "password", "name", "slug", "description", 
    "phone", "address", "logo", "banner", "isActive", "createdAt", "updatedAt", "ownerId",
    "isOpen", "openingHours", "deliveryFee", "minimumOrder", "deliveryTime",
    "acceptsDelivery", "acceptsPickup", "acceptsDineIn", "subscriptionExpiresAt",
    "mercadoPagoAccessToken", "mercadoPagoConfigured", "mercadoPagoPublicKey"
)
SELECT 
    "id", 'DELIVERY_BUSINESS', "email", "password", "name", "slug", "description",
    "phone", "address", "avatar", "banner", "isActive", "createdAt", "updatedAt", "ownerId",
    "isOpen", "openingHours", "deliveryFee", "minimumOrder", "deliveryTime",
    "acceptsDelivery", "acceptsPickup", "acceptsDineIn", "subscriptionExpiresAt",
    "mercadoPagoAccessToken", "mercadoPagoConfigured", "mercadoPagoPublicKey"
FROM "restaurants";