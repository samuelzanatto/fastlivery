-- Script para adicionar categorias padrão para suppliers
-- Execute este script após criar um supplier para adicionar categorias básicas

-- Categorias principais padrão para suppliers
INSERT INTO supplier_service_categories (id, company_id, name, description, parent_id, "order", is_active, created_at, updated_at)
VALUES 
  -- Categorias principais
  ('cat_ingredients', 'REPLACE_WITH_COMPANY_ID', 'Ingredientes', 'Ingredientes e matérias-primas alimentícias', NULL, 1, true, NOW(), NOW()),
  ('cat_packaging', 'REPLACE_WITH_COMPANY_ID', 'Embalagens', 'Embalagens e materiais de acondicionamento', NULL, 2, true, NOW(), NOW()),
  ('cat_equipment', 'REPLACE_WITH_COMPANY_ID', 'Equipamentos', 'Equipamentos e utensílios para cozinha', NULL, 3, true, NOW(), NOW()),
  ('cat_services', 'REPLACE_WITH_COMPANY_ID', 'Serviços', 'Serviços especializados', NULL, 4, true, NOW(), NOW()),
  
  -- Subcategorias de Ingredientes
  ('subcat_spices', 'REPLACE_WITH_COMPANY_ID', 'Temperos e Condimentos', 'Temperos, especiarias e condimentos', 'cat_ingredients', 1, true, NOW(), NOW()),
  ('subcat_proteins', 'REPLACE_WITH_COMPANY_ID', 'Proteínas', 'Carnes, peixes e proteínas vegetais', 'cat_ingredients', 2, true, NOW(), NOW()),
  ('subcat_dairy', 'REPLACE_WITH_COMPANY_ID', 'Laticínios', 'Leites, queijos e derivados', 'cat_ingredients', 3, true, NOW(), NOW()),
  
  -- Subcategorias de Embalagens
  ('subcat_takeaway', 'REPLACE_WITH_COMPANY_ID', 'Delivery e Takeaway', 'Embalagens para delivery e takeaway', 'cat_packaging', 1, true, NOW(), NOW()),
  ('subcat_storage', 'REPLACE_WITH_COMPANY_ID', 'Armazenamento', 'Embalagens para armazenamento e conservação', 'cat_packaging', 2, true, NOW(), NOW()),
  
  -- Subcategorias de Equipamentos
  ('subcat_kitchen', 'REPLACE_WITH_COMPANY_ID', 'Cozinha', 'Equipamentos de cozinha e preparo', 'cat_equipment', 1, true, NOW(), NOW()),
  ('subcat_cleaning', 'REPLACE_WITH_COMPANY_ID', 'Limpeza', 'Equipamentos de limpeza e higienização', 'cat_equipment', 2, true, NOW(), NOW()),
  
  -- Subcategorias de Serviços
  ('subcat_consulting', 'REPLACE_WITH_COMPANY_ID', 'Consultoria', 'Consultoria e assessoria especializada', 'cat_services', 1, true, NOW(), NOW()),
  ('subcat_maintenance', 'REPLACE_WITH_COMPANY_ID', 'Manutenção', 'Serviços de manutenção e reparo', 'cat_services', 2, true, NOW(), NOW());

-- Notas:
-- 1. Substitua 'REPLACE_WITH_COMPANY_ID' pelo ID real da company do supplier
-- 2. Este script cria uma estrutura hierárquica básica
-- 3. As categorias podem ser editadas, removidas ou novas podem ser adicionadas via interface
-- 4. Os IDs são fixos para facilitar referências futuras, mas podem ser alterados se necessário