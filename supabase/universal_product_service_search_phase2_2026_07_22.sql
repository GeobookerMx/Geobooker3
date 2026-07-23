-- ============================================================================
-- Geobooker Universal Product/Service Search Expansion - Phase 2
-- Fecha: 2026-07-22
-- Objetivo:
-- - Ampliar busquedas por componentes, materiales, productos e industrias.
-- - Resolver consultas hiper-especificas hacia negocios probables cercanos.
-- - No prometer stock, precio, diagnostico ni disponibilidad.
-- Requiere: business_knowledge_graph_phase1.sql aplicado.
-- ============================================================================

BEGIN;

INSERT INTO public.business_categories (
  slug, name_es, name_en, description_es, description_en, schema_org_type, icon, sort_order, search_priority
)
VALUES
  ('industrial-components', 'Componentes industriales', 'Industrial Components', 'Rodamientos, bandas industriales, mangueras hidraulicas, transmision de potencia y refacciones MRO.', 'Bearings, industrial belts, hydraulic hoses, power transmission and MRO components.', 'Store', 'settings', 241, 89),
  ('electrical-supplies', 'Material electrico', 'Electrical Supplies', 'Cable, apagadores, contactos, breakers, conduit, centros de carga y material electrico.', 'Wire, switches, outlets, breakers, conduit, load centers and electrical supplies.', 'Store', 'zap', 242, 88),
  ('plumbing-supplies', 'Plomeria y conexiones', 'Plumbing Supplies', 'Tuberia, conexiones, valvulas, bombas, tinacos y material de plomeria.', 'Pipes, fittings, valves, pumps, tanks and plumbing supplies.', 'Store', 'droplets', 243, 88),
  ('hvac-refrigeration', 'Aire acondicionado y refrigeracion', 'HVAC and Refrigeration', 'Minisplit, aire acondicionado, refrigeracion comercial, refacciones HVAC y servicio tecnico.', 'Air conditioning, HVAC supplies, commercial refrigeration, parts and technical service.', 'Store', 'snowflake', 244, 87),
  ('lab-dental-supplies', 'Laboratorio y dental', 'Laboratory and Dental Supplies', 'Material dental, instrumental, reactivos, consumibles de laboratorio e insumos clinicos.', 'Dental supplies, instruments, reagents, laboratory consumables and clinical supplies.', 'MedicalBusiness', 'flask', 245, 86),
  ('uniforms-textiles', 'Uniformes, textiles y bordado', 'Uniforms, Textiles and Embroidery', 'Uniformes, bordado, serigrafia, sublimacion, telas y textiles empresariales.', 'Uniforms, embroidery, screen printing, sublimation, fabrics and business textiles.', 'Store', 'shirt', 246, 84),
  ('solar-energy', 'Paneles solares y energia', 'Solar Energy and Supplies', 'Paneles solares, inversores, baterias solares, instalacion y equipo fotovoltaico.', 'Solar panels, inverters, batteries, installation and photovoltaic equipment.', 'Store', 'sun', 247, 84),
  ('professional-services', 'Servicios profesionales', 'Professional Services', 'Contadores, abogados, asesoria fiscal, contratos, notarias y servicios administrativos.', 'Accountants, lawyers, tax advice, contracts, notaries and administrative services.', 'ProfessionalService', 'briefcase', 248, 83)
ON CONFLICT (slug) DO UPDATE
SET
  name_es = EXCLUDED.name_es,
  name_en = EXCLUDED.name_en,
  description_es = EXCLUDED.description_es,
  description_en = EXCLUDED.description_en,
  schema_org_type = EXCLUDED.schema_org_type,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  search_priority = EXCLUDED.search_priority,
  updated_at = NOW();

WITH categories AS (
  SELECT id, slug FROM public.business_categories
), aliases(slug, alias, language, country, alias_type, weight, notes) AS (
  VALUES
    ('industrial-components', 'balero', 'es', NULL, 'product', 94, 'Componente industrial; confirmar medida y disponibilidad'),
    ('industrial-components', 'rodamientos', 'es', NULL, 'product', 96, 'Componente industrial'),
    ('industrial-components', 'chumacera', 'es', NULL, 'product', 92, 'Componente industrial'),
    ('industrial-components', 'banda industrial', 'es', NULL, 'product', 92, 'Transmision de potencia'),
    ('industrial-components', 'manguera hidraulica', 'es', NULL, 'product', 96, 'Hidraulica industrial'),
    ('industrial-components', 'conexiones hidraulicas', 'es', NULL, 'product', 92, 'Hidraulica industrial'),
    ('industrial-components', 'bearings', 'en', NULL, 'translation', 94, 'English search'),
    ('industrial-components', 'hydraulic hose', 'en', NULL, 'translation', 94, 'English search'),
    ('industrial-components', 'power transmission', 'en', NULL, 'translation', 90, 'English search'),

    ('electrical-supplies', 'material electrico', 'es', NULL, 'synonym', 96, 'Material electrico'),
    ('electrical-supplies', 'cable electrico', 'es', NULL, 'product', 94, 'Producto electrico'),
    ('electrical-supplies', 'breaker', 'es', NULL, 'product', 90, 'Producto electrico'),
    ('electrical-supplies', 'centro de carga', 'es', NULL, 'product', 90, 'Producto electrico'),
    ('electrical-supplies', 'tubo conduit', 'es', NULL, 'product', 88, 'Producto electrico'),
    ('electrical-supplies', 'electric supplies', 'en', NULL, 'translation', 94, 'English search'),
    ('electrical-supplies', 'circuit breaker', 'en', NULL, 'translation', 90, 'English search'),

    ('plumbing-supplies', 'material de plomeria', 'es', NULL, 'synonym', 96, 'Plomeria'),
    ('plumbing-supplies', 'tuberia pvc', 'es', NULL, 'product', 94, 'Producto plomeria'),
    ('plumbing-supplies', 'conexiones pvc', 'es', NULL, 'product', 92, 'Producto plomeria'),
    ('plumbing-supplies', 'valvulas', 'es', NULL, 'product', 90, 'Producto plomeria'),
    ('plumbing-supplies', 'bomba de agua', 'es', NULL, 'product', 90, 'Producto plomeria'),
    ('plumbing-supplies', 'plumbing supplies', 'en', NULL, 'translation', 94, 'English search'),
    ('plumbing-supplies', 'pipe fittings', 'en', NULL, 'translation', 90, 'English search'),

    ('hvac-refrigeration', 'minisplit', 'es', NULL, 'product', 94, 'HVAC'),
    ('hvac-refrigeration', 'aire acondicionado', 'es', NULL, 'product', 94, 'HVAC'),
    ('hvac-refrigeration', 'refrigeracion comercial', 'es', NULL, 'synonym', 94, 'Refrigeracion'),
    ('hvac-refrigeration', 'gas refrigerante', 'es', NULL, 'product', 90, 'HVAC'),
    ('hvac-refrigeration', 'camara fria', 'es', NULL, 'product', 88, 'Refrigeracion comercial'),
    ('hvac-refrigeration', 'hvac supplies', 'en', NULL, 'translation', 94, 'English search'),
    ('hvac-refrigeration', 'commercial refrigeration', 'en', NULL, 'translation', 92, 'English search'),

    ('lab-dental-supplies', 'material dental', 'es', NULL, 'product', 94, 'Dental'),
    ('lab-dental-supplies', 'resina dental', 'es', NULL, 'product', 90, 'Dental'),
    ('lab-dental-supplies', 'reactivos laboratorio', 'es', NULL, 'product', 90, 'Laboratorio'),
    ('lab-dental-supplies', 'material clinico', 'es', NULL, 'product', 90, 'Clinico'),
    ('lab-dental-supplies', 'dental supplies', 'en', NULL, 'translation', 94, 'English search'),
    ('lab-dental-supplies', 'laboratory supplies', 'en', NULL, 'translation', 92, 'English search'),

    ('uniforms-textiles', 'uniformes', 'es', NULL, 'product', 94, 'Textiles'),
    ('uniforms-textiles', 'bordados', 'es', NULL, 'synonym', 92, 'Servicio relacionado'),
    ('uniforms-textiles', 'serigrafia', 'es', NULL, 'synonym', 90, 'Servicio relacionado'),
    ('uniforms-textiles', 'playeras personalizadas', 'es', NULL, 'product', 90, 'Textiles'),
    ('uniforms-textiles', 'custom uniforms', 'en', NULL, 'translation', 92, 'English search'),
    ('uniforms-textiles', 'embroidery', 'en', NULL, 'translation', 90, 'English search'),

    ('solar-energy', 'paneles solares', 'es', NULL, 'product', 94, 'Energia solar'),
    ('solar-energy', 'inversor solar', 'es', NULL, 'product', 90, 'Energia solar'),
    ('solar-energy', 'bateria solar', 'es', NULL, 'product', 90, 'Energia solar'),
    ('solar-energy', 'instalacion solar', 'es', NULL, 'synonym', 92, 'Servicio solar'),
    ('solar-energy', 'solar panels', 'en', NULL, 'translation', 94, 'English search'),
    ('solar-energy', 'solar installer', 'en', NULL, 'translation', 92, 'English search'),

    ('professional-services', 'contador', 'es', NULL, 'profession', 94, 'Servicio profesional'),
    ('professional-services', 'asesoria fiscal', 'es', NULL, 'synonym', 92, 'Servicio fiscal'),
    ('professional-services', 'abogado', 'es', NULL, 'profession', 92, 'Servicio legal'),
    ('professional-services', 'contratos', 'es', NULL, 'problem', 88, 'Necesidad legal'),
    ('professional-services', 'accountant', 'en', NULL, 'translation', 92, 'English search'),
    ('professional-services', 'lawyer', 'en', NULL, 'translation', 92, 'English search')
)
INSERT INTO public.business_category_aliases (
  category_id, alias, alias_normalized, language, country, alias_type, weight, notes
)
SELECT
  bc.id,
  a.alias,
  public.gbk_normalize_text(a.alias),
  a.language,
  a.country,
  a.alias_type,
  a.weight,
  a.notes
FROM aliases a
JOIN categories bc ON bc.slug = a.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.business_category_aliases existing
  WHERE existing.category_id = bc.id
    AND existing.alias_normalized = public.gbk_normalize_text(a.alias)
    AND COALESCE(existing.language, '') = COALESCE(a.language, '')
    AND COALESCE(existing.country, '') = COALESCE(a.country, '')
    AND existing.alias_type = a.alias_type
);

WITH categories AS (
  SELECT id, slug FROM public.business_categories
), intents(slug, phrase, language, country, weight, intent_type) AS (
  VALUES
    ('industrial-components', 'donde compro rodamientos cerca', 'es', NULL, 94, 'product_need'),
    ('industrial-components', 'manguera hidraulica cerca', 'es', NULL, 94, 'product_need'),
    ('industrial-components', 'hydraulic hose near me', 'en', NULL, 94, 'voice_search'),
    ('electrical-supplies', 'donde venden cable electrico cerca', 'es', NULL, 92, 'product_need'),
    ('electrical-supplies', 'electric supplies near me', 'en', NULL, 94, 'voice_search'),
    ('plumbing-supplies', 'tuberia pvc y conexiones cerca', 'es', NULL, 92, 'product_need'),
    ('plumbing-supplies', 'plumbing supplies near me', 'en', NULL, 94, 'voice_search'),
    ('hvac-refrigeration', 'refrigeracion comercial cerca', 'es', NULL, 92, 'product_need'),
    ('hvac-refrigeration', 'hvac supplies near me', 'en', NULL, 94, 'voice_search'),
    ('lab-dental-supplies', 'material dental cerca', 'es', NULL, 92, 'product_need'),
    ('lab-dental-supplies', 'dental supplies near me', 'en', NULL, 94, 'voice_search'),
    ('uniforms-textiles', 'uniformes bordados cerca', 'es', NULL, 92, 'product_need'),
    ('uniforms-textiles', 'custom uniforms near me', 'en', NULL, 92, 'voice_search'),
    ('solar-energy', 'instalacion de paneles solares cerca', 'es', NULL, 92, 'product_need'),
    ('solar-energy', 'solar installer near me', 'en', NULL, 92, 'voice_search'),
    ('professional-services', 'contador resico cerca', 'es', NULL, 90, 'professional_need'),
    ('professional-services', 'abogado contratos cerca', 'es', NULL, 90, 'professional_need'),
    ('professional-services', 'accountant near me', 'en', NULL, 92, 'voice_search')
)
INSERT INTO public.business_search_intents (
  category_id, intent_phrase, intent_normalized, language, country, weight, intent_type
)
SELECT
  bc.id,
  i.phrase,
  public.gbk_normalize_text(i.phrase),
  i.language,
  i.country,
  i.weight,
  i.intent_type
FROM intents i
JOIN categories bc ON bc.slug = i.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.business_search_intents existing
  WHERE existing.category_id = bc.id
    AND existing.intent_normalized = public.gbk_normalize_text(i.phrase)
    AND COALESCE(existing.language, '') = COALESCE(i.language, '')
    AND COALESCE(existing.country, '') = COALESCE(i.country, '')
    AND existing.intent_type = i.intent_type
);

COMMIT;

-- Verificacion:
-- SELECT slug, name_es, search_priority FROM public.business_categories WHERE slug IN ('industrial-components','electrical-supplies','plumbing-supplies','hvac-refrigeration','lab-dental-supplies','uniforms-textiles','solar-energy','professional-services') ORDER BY sort_order;
-- SELECT bc.slug, count(*) FROM public.business_category_aliases a JOIN public.business_categories bc ON bc.id = a.category_id WHERE bc.slug IN ('industrial-components','electrical-supplies','plumbing-supplies','hvac-refrigeration','lab-dental-supplies','uniforms-textiles','solar-energy','professional-services') GROUP BY bc.slug ORDER BY bc.slug;
-- SELECT bc.slug, count(*) FROM public.business_search_intents i JOIN public.business_categories bc ON bc.id = i.category_id WHERE bc.slug IN ('industrial-components','electrical-supplies','plumbing-supplies','hvac-refrigeration','lab-dental-supplies','uniforms-textiles','solar-energy','professional-services') GROUP BY bc.slug ORDER BY bc.slug;
