BEGIN;

-- Search Discovery V2: catalogo inicial EN/ES global. Esta migracion solo
-- amplia taxonomia y aliases; no importa negocios, no llama proveedores y no
-- modifica visibilidad de registros.

DO $$
BEGIN
  IF to_regclass('public.business_categories') IS NULL
     OR to_regclass('public.business_category_aliases') IS NULL
     OR to_regclass('public.business_search_intents') IS NULL THEN
    RAISE EXCEPTION
      'SEARCH_DISCOVERY_V2 requires the Business Knowledge Graph foundation before this migration';
  END IF;

  IF to_regprocedure('public.gbk_normalize_text(text)') IS NULL THEN
    RAISE EXCEPTION
      'SEARCH_DISCOVERY_V2 requires public.gbk_normalize_text(text)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_categories
    WHERE slug = 'tire-service'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.business_categories
    WHERE slug = 'auto-parts'
  ) THEN
    RAISE EXCEPTION
      'SEARCH_DISCOVERY_V2 requires the tire-service and auto-parts core categories';
  END IF;
END;
$$;

INSERT INTO public.business_categories (
  slug, name_es, name_en, description_es, description_en,
  schema_org_type, icon, sort_order, search_priority
)
VALUES
  ('mexican-restaurant', 'Restaurante mexicano', 'Mexican Restaurant', 'Comida mexicana, tacos y antojitos.', 'Mexican food, tacos and traditional dishes.', 'Restaurant', 'utensils-crossed', 210, 95),
  ('car-wash', 'Autolavado', 'Car Wash', 'Lavado y detallado automotriz.', 'Car wash and auto detailing.', 'AutoWash', 'car', 220, 90),
  ('computer-store', 'Tienda de computadoras', 'Computer Store', 'Computadoras, componentes y accesorios.', 'Computers, components and accessories.', 'ComputerStore', 'monitor', 230, 90),
  ('computer-repair', 'Reparacion de computadoras', 'Computer Repair', 'Diagnostico y reparacion de computadoras.', 'Computer diagnostics and repair.', 'ProfessionalService', 'wrench', 240, 90),
  ('furniture-store', 'Muebleria', 'Furniture Store', 'Muebles, salas, comedores y mobiliario.', 'Furniture, sofas, dining sets and home furnishings.', 'FurnitureStore', 'sofa', 250, 90),
  ('appliance-store', 'Tienda de electrodomesticos', 'Appliance Store', 'Linea blanca y electrodomesticos.', 'Home appliances and white goods.', 'HomeGoodsStore', 'refrigerator', 260, 90),
  ('appliance-repair', 'Reparacion de electrodomesticos', 'Appliance Repair', 'Servicio tecnico para refrigeradores y electrodomesticos.', 'Refrigerator and appliance repair.', 'ProfessionalService', 'wrench', 270, 88),
  ('glass-mirror-shop', 'Vidrieria y espejos', 'Glass and Mirror Shop', 'Vidrio, cristales y espejos a medida.', 'Glass, glazing and custom mirrors.', 'HomeGoodsStore', 'square', 280, 85)
ON CONFLICT (slug) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  name_en = EXCLUDED.name_en,
  description_es = EXCLUDED.description_es,
  description_en = EXCLUDED.description_en,
  schema_org_type = EXCLUDED.schema_org_type,
  icon = EXCLUDED.icon,
  search_priority = EXCLUDED.search_priority,
  updated_at = NOW();

WITH categories AS (
  SELECT id, slug FROM public.business_categories
), aliases(slug, alias, language, country, alias_type, weight, notes) AS (
  VALUES
    ('tire-service', 'tyre', 'en', NULL, 'product', 100, 'Variante internacional EN'),
    ('tire-service', 'tyres', 'en', NULL, 'product', 100, 'Variante GB/CA/AU'),
    ('tire-service', 'tyre shop', 'en', NULL, 'translation', 100, 'Variante GB/CA/AU'),
    ('tire-service', 'tyre repair', 'en', NULL, 'problem', 98, 'Servicio'),
    ('tire-service', 'tire', 'en', NULL, 'product', 100, 'Variante US/CA'),
    ('tire-service', 'tires', 'en', NULL, 'product', 100, 'Variante US/CA'),
    ('tire-service', 'tire shop', 'en', NULL, 'translation', 100, 'Servicio'),
    ('tire-service', 'llantera', 'es', NULL, 'regionalism', 100, 'Servicio'),
    ('tire-service', 'neumaticos', 'es', NULL, 'product', 96, 'Producto'),
    ('auto-parts', 'tyres', 'en', NULL, 'product', 72, 'Resultado relacionado secundario'),
    ('auto-parts', 'tires', 'en', NULL, 'product', 72, 'Resultado relacionado secundario'),

    ('mexican-restaurant', 'mexican food', 'en', NULL, 'translation', 100, 'Consulta global'),
    ('mexican-restaurant', 'mexican restaurant', 'en', NULL, 'translation', 100, 'Consulta global'),
    ('mexican-restaurant', 'mexican cuisine', 'en', NULL, 'translation', 96, 'Consulta global'),
    ('mexican-restaurant', 'comida mexicana', 'es', NULL, 'synonym', 100, 'Canonico'),
    ('mexican-restaurant', 'restaurante mexicano', 'es', NULL, 'synonym', 100, 'Canonico'),
    ('mexican-restaurant', 'taqueria', 'es', NULL, 'product', 88, 'Relacionado'),

    ('car-wash', 'car wash', 'en', NULL, 'translation', 100, 'Canonico'),
    ('car-wash', 'auto detailing', 'en', NULL, 'product', 94, 'Servicio'),
    ('car-wash', 'autolavado', 'es', NULL, 'synonym', 100, 'Canonico'),
    ('car-wash', 'lavado de autos', 'es', NULL, 'synonym', 98, 'Servicio'),

    ('computer-store', 'computer', 'en', NULL, 'product', 92, 'Producto general'),
    ('computer-store', 'computers', 'en', NULL, 'product', 92, 'Producto general'),
    ('computer-store', 'computer store', 'en', NULL, 'translation', 100, 'Canonico'),
    ('computer-store', 'pc components', 'en', NULL, 'product', 94, 'Componentes'),
    ('computer-store', 'computadoras', 'es', NULL, 'product', 94, 'Producto general'),
    ('computer-repair', 'computer repair', 'en', NULL, 'translation', 100, 'Canonico'),
    ('computer-repair', 'laptop repair', 'en', NULL, 'product', 94, 'Servicio'),
    ('computer-repair', 'reparacion de computadoras', 'es', NULL, 'synonym', 100, 'Canonico'),

    ('furniture-store', 'furniture', 'en', NULL, 'product', 96, 'Producto general'),
    ('furniture-store', 'furniture store', 'en', NULL, 'translation', 100, 'Canonico'),
    ('furniture-store', 'sofa', 'en', NULL, 'product', 88, 'Producto'),
    ('furniture-store', 'dining set', 'en', NULL, 'product', 88, 'Producto'),
    ('furniture-store', 'muebles', 'es', NULL, 'product', 96, 'Producto general'),
    ('furniture-store', 'muebleria', 'es', NULL, 'synonym', 100, 'Canonico'),
    ('furniture-store', 'salas', 'es', NULL, 'product', 88, 'Producto'),
    ('furniture-store', 'comedores', 'es', NULL, 'product', 88, 'Producto'),

    ('appliance-store', 'appliances', 'en', NULL, 'product', 96, 'Producto general'),
    ('appliance-store', 'appliance store', 'en', NULL, 'translation', 100, 'Canonico'),
    ('appliance-store', 'white goods', 'en', NULL, 'regionalism', 94, 'Variante EN'),
    ('appliance-store', 'refrigerator', 'en', NULL, 'product', 92, 'Producto'),
    ('appliance-store', 'fridge', 'en', NULL, 'regionalism', 90, 'Producto'),
    ('appliance-store', 'electrodomesticos', 'es', NULL, 'product', 96, 'Producto general'),
    ('appliance-store', 'refrigerador', 'es', NULL, 'product', 92, 'Producto'),
    ('appliance-store', 'linea blanca', 'es', NULL, 'synonym', 94, 'Categoria'),
    ('appliance-repair', 'appliance repair', 'en', NULL, 'translation', 100, 'Canonico'),
    ('appliance-repair', 'refrigerator repair', 'en', NULL, 'problem', 100, 'Servicio'),
    ('appliance-repair', 'reparacion de refrigeradores', 'es', NULL, 'problem', 100, 'Servicio'),

    ('glass-mirror-shop', 'mirror shop', 'en', NULL, 'translation', 100, 'Canonico'),
    ('glass-mirror-shop', 'mirrors', 'en', NULL, 'product', 94, 'Producto'),
    ('glass-mirror-shop', 'custom mirror', 'en', NULL, 'product', 96, 'Producto'),
    ('glass-mirror-shop', 'glass shop', 'en', NULL, 'translation', 94, 'Servicio'),
    ('glass-mirror-shop', 'glazier', 'en', NULL, 'profession', 94, 'Profesion'),
    ('glass-mirror-shop', 'espejos', 'es', NULL, 'product', 96, 'Producto'),
    ('glass-mirror-shop', 'espejos a medida', 'es', NULL, 'product', 100, 'Producto'),
    ('glass-mirror-shop', 'vidrieria', 'es', NULL, 'synonym', 100, 'Canonico')
)
INSERT INTO public.business_category_aliases (
  category_id, alias, alias_normalized, language, country,
  alias_type, weight, notes
)
SELECT
  categories.id,
  aliases.alias,
  public.gbk_normalize_text(aliases.alias),
  aliases.language,
  aliases.country,
  aliases.alias_type,
  aliases.weight,
  aliases.notes
FROM aliases
JOIN categories ON categories.slug = aliases.slug
ON CONFLICT DO NOTHING;

WITH categories AS (
  SELECT id, slug FROM public.business_categories
), intents(slug, phrase, language, country, weight, intent_type) AS (
  VALUES
    ('tire-service', 'tyres near me', 'en', NULL, 100, 'voice_search'),
    ('tire-service', 'where can I repair a flat tyre', 'en', NULL, 98, 'need_state'),
    ('mexican-restaurant', 'Mexican food near me', 'en', NULL, 100, 'voice_search'),
    ('car-wash', 'car wash near me', 'en', NULL, 100, 'voice_search'),
    ('computer-repair', 'where can I repair my computer', 'en', NULL, 98, 'need_state'),
    ('furniture-store', 'furniture store near me', 'en', NULL, 100, 'voice_search'),
    ('appliance-repair', 'refrigerator repair near me', 'en', NULL, 100, 'voice_search'),
    ('glass-mirror-shop', 'custom mirrors near me', 'en', NULL, 98, 'voice_search')
)
INSERT INTO public.business_search_intents (
  category_id, intent_phrase, intent_normalized, language, country,
  weight, intent_type
)
SELECT
  categories.id,
  intents.phrase,
  public.gbk_normalize_text(intents.phrase),
  intents.language,
  intents.country,
  intents.weight,
  intents.intent_type
FROM intents
JOIN categories ON categories.slug = intents.slug
ON CONFLICT DO NOTHING;

COMMIT;
