-- ============================================================================
-- GEOBOOKER - Supply Chain / Product Search Expansion
-- Objetivo: mejorar busquedas tipo materiales, alimentos, componentes,
-- proveedores e insumos desde el buscador principal sin romper categorias base.
-- Ejecutar despues de business_knowledge_graph_phase1.sql.
-- ============================================================================

insert into public.business_categories (
  slug, name_es, name_en, description_es, description_en, schema_org_type, icon, sort_order, search_priority
)
values
  ('construction-supplies', 'Materiales de construccion', 'Construction Supplies', 'Cemento, concreto, varilla, block, arena, grava y materiales para obra.', 'Cement, concrete, rebar, blocks, aggregates and building supplies.', 'HardwareStore', 'blocks', 210, 92),
  ('industrial-supplies', 'Insumos industriales', 'Industrial Supplies', 'Componentes, maquinaria, refacciones industriales y suministro para operacion.', 'Industrial components, machinery, spare parts and operational supplies.', 'LocalBusiness', 'factory', 220, 90),
  ('metal-supplies', 'Acero y metales', 'Steel and Metal Supplies', 'Acero, lamina, placa, perfiles, tubos y aluminio industrial.', 'Steel, sheet metal, plates, profiles, tubing and industrial aluminum.', 'LocalBusiness', 'landmark', 230, 88),
  ('packaging-supplies', 'Empaque y embalaje', 'Packaging Supplies', 'Tarimas, cajas, carton, stretch film, pallets y materiales de embalaje.', 'Pallets, boxes, cardboard, stretch film and packaging materials.', 'Store', 'package', 240, 86),
  ('food-suppliers', 'Proveedores de alimentos', 'Food Suppliers', 'Alimentos al mayoreo, insumos para restaurante, carnes, frutas, verduras y abarrotes.', 'Wholesale food, restaurant supplies, meat, produce and groceries.', 'FoodEstablishment', 'shopping-basket', 250, 88),
  ('chemical-supplies', 'Productos quimicos', 'Chemical Supplies', 'Quimicos, solventes, limpieza industrial, resinas e insumos quimicos.', 'Chemical products, solvents, industrial cleaning, resins and chemical supplies.', 'LocalBusiness', 'flask-conical', 260, 84)
on conflict (slug) do update
set
  name_es = excluded.name_es,
  name_en = excluded.name_en,
  description_es = excluded.description_es,
  description_en = excluded.description_en,
  schema_org_type = excluded.schema_org_type,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  search_priority = excluded.search_priority,
  updated_at = now();

with categories as (
  select id, slug from public.business_categories
), aliases(slug, alias, language, country, alias_type, weight, notes) as (
  values
    ('construction-supplies', 'materiales de construccion', 'es', null, 'synonym', 100, 'Categoria principal'),
    ('construction-supplies', 'cemento', 'es', null, 'product', 98, 'Producto frecuente'),
    ('construction-supplies', 'concreto', 'es', null, 'product', 96, 'Producto frecuente'),
    ('construction-supplies', 'block', 'es', 'MX', 'product', 92, 'Producto frecuente MX'),
    ('construction-supplies', 'varilla', 'es', 'MX', 'product', 95, 'Producto frecuente MX'),
    ('construction-supplies', 'arena', 'es', null, 'product', 88, 'Material'),
    ('construction-supplies', 'grava', 'es', null, 'product', 88, 'Material'),
    ('construction-supplies', 'building supplies', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('construction-supplies', 'cement', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('construction-supplies', 'concrete supplier', 'en', null, 'translation', 94, 'Busqueda ingles'),
    ('industrial-supplies', 'insumos industriales', 'es', null, 'synonym', 100, 'Categoria principal'),
    ('industrial-supplies', 'componentes industriales', 'es', null, 'product', 96, 'Producto B2B'),
    ('industrial-supplies', 'refacciones industriales', 'es', null, 'product', 95, 'Producto B2B'),
    ('industrial-supplies', 'maquinaria industrial', 'es', null, 'product', 92, 'Producto B2B'),
    ('industrial-supplies', 'industrial supplies', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('industrial-supplies', 'industrial components', 'en', null, 'translation', 94, 'Busqueda ingles'),
    ('metal-supplies', 'acero', 'es', null, 'product', 100, 'Producto principal'),
    ('metal-supplies', 'lamina', 'es', null, 'product', 94, 'Producto metal'),
    ('metal-supplies', 'placa', 'es', null, 'product', 90, 'Producto metal'),
    ('metal-supplies', 'perfiles de acero', 'es', null, 'product', 94, 'Producto metal'),
    ('metal-supplies', 'tubo de acero', 'es', null, 'product', 90, 'Producto metal'),
    ('metal-supplies', 'steel supplier', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('packaging-supplies', 'empaque', 'es', null, 'synonym', 96, 'Categoria'),
    ('packaging-supplies', 'embalaje', 'es', null, 'synonym', 96, 'Categoria'),
    ('packaging-supplies', 'tarimas', 'es', 'MX', 'product', 98, 'Producto logistico'),
    ('packaging-supplies', 'pallets', 'en', null, 'translation', 98, 'Busqueda ingles'),
    ('packaging-supplies', 'cajas de carton', 'es', null, 'product', 92, 'Producto empaque'),
    ('packaging-supplies', 'packaging supplies', 'en', null, 'translation', 94, 'Busqueda ingles'),
    ('food-suppliers', 'proveedor de alimentos', 'es', null, 'synonym', 100, 'Categoria principal'),
    ('food-suppliers', 'alimentos mayoreo', 'es', null, 'product', 96, 'Intencion B2B'),
    ('food-suppliers', 'insumos para restaurante', 'es', null, 'product', 96, 'Intencion B2B'),
    ('food-suppliers', 'pollo mayoreo', 'es', null, 'product', 90, 'Producto food'),
    ('food-suppliers', 'carne mayoreo', 'es', null, 'product', 90, 'Producto food'),
    ('food-suppliers', 'food supplier', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('food-suppliers', 'restaurant supplies', 'en', null, 'translation', 94, 'Busqueda ingles'),
    ('chemical-supplies', 'productos quimicos', 'es', null, 'synonym', 100, 'Categoria principal'),
    ('chemical-supplies', 'quimicos', 'es', null, 'product', 96, 'Busqueda comun sin acento'),
    ('chemical-supplies', 'limpieza industrial', 'es', null, 'product', 90, 'Subvertical'),
    ('chemical-supplies', 'chemical supplier', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('chemical-supplies', 'industrial chemicals', 'en', null, 'translation', 94, 'Busqueda ingles')
)
insert into public.business_category_aliases (
  category_id, alias, alias_normalized, language, country, alias_type, weight, notes
)
select
  bc.id,
  a.alias,
  public.gbk_normalize_text(a.alias),
  a.language,
  a.country,
  a.alias_type,
  a.weight,
  a.notes
from aliases a
join categories bc on bc.slug = a.slug
where not exists (
  select 1
  from public.business_category_aliases existing
  where existing.category_id = bc.id
    and existing.alias_normalized = public.gbk_normalize_text(a.alias)
    and coalesce(existing.language, '') = coalesce(a.language, '')
    and coalesce(existing.country, '') = coalesce(a.country, '')
    and existing.alias_type = a.alias_type
);

with categories as (
  select id, slug from public.business_categories
), intents(slug, phrase, language, country, weight, intent_type) as (
  values
    ('construction-supplies', 'donde compro cemento', 'es', 'MX', 96, 'voice_search'),
    ('construction-supplies', 'necesito material para construccion', 'es', null, 96, 'need_state'),
    ('industrial-supplies', 'busco proveedor industrial', 'es', null, 94, 'voice_search'),
    ('industrial-supplies', 'necesito componentes industriales', 'es', null, 95, 'need_state'),
    ('metal-supplies', 'donde venden acero', 'es', null, 95, 'voice_search'),
    ('packaging-supplies', 'necesito tarimas', 'es', 'MX', 96, 'need_state'),
    ('packaging-supplies', 'busco empaque para envio', 'es', null, 92, 'need_state'),
    ('food-suppliers', 'busco proveedor de alimentos', 'es', null, 98, 'voice_search'),
    ('food-suppliers', 'insumos para restaurante cerca', 'es', null, 95, 'voice_search'),
    ('chemical-supplies', 'donde venden productos quimicos', 'es', null, 94, 'voice_search')
)
insert into public.business_search_intents (
  category_id, intent_phrase, intent_normalized, language, country, weight, intent_type
)
select
  bc.id,
  i.phrase,
  public.gbk_normalize_text(i.phrase),
  i.language,
  i.country,
  i.weight,
  i.intent_type
from intents i
join categories bc on bc.slug = i.slug
where not exists (
  select 1
  from public.business_search_intents existing
  where existing.category_id = bc.id
    and existing.intent_normalized = public.gbk_normalize_text(i.phrase)
    and coalesce(existing.language, '') = coalesce(i.language, '')
    and coalesce(existing.country, '') = coalesce(i.country, '')
    and existing.intent_type = i.intent_type
);

with rules(slug, confidence, is_primary, source, patterns) as (
  values
    ('construction-supplies', 0.90::numeric, false, 'admin_reviewed', array['materiales de construccion','cemento','concreto','block','ladrillo','varilla','arena','grava','casa de materiales']),
    ('industrial-supplies', 0.88::numeric, false, 'admin_reviewed', array['insumos industriales','componentes industriales','refacciones industriales','maquinaria','equipo industrial','servicios industriales']),
    ('metal-supplies', 0.88::numeric, false, 'admin_reviewed', array['acero','lamina','placa','perfiles','tubo','metal','metalmecanica','aluminio']),
    ('packaging-supplies', 0.86::numeric, false, 'admin_reviewed', array['empaque','embalaje','tarimas','pallets','carton','cajas']),
    ('food-suppliers', 0.86::numeric, false, 'admin_reviewed', array['proveedor de alimentos','alimentos','mayoreo','abarrotes','carnes','frutas','verduras','insumos para restaurante']),
    ('chemical-supplies', 0.84::numeric, false, 'admin_reviewed', array['quimicos','quimica','productos quimicos','solventes','resinas','limpieza industrial'])
), normalized_businesses as (
  select
    b.id as business_id,
    public.gbk_normalize_text(
      coalesce(b.name, '') || ' ' ||
      coalesce(b.category, '') || ' ' ||
      coalesce(b.subcategory, '') || ' ' ||
      coalesce(b.description, '')
    ) as searchable_text
  from public.businesses b
  where b.status = 'approved'
    and coalesce(b.is_visible, true) = true
), scored as (
  select
    nb.business_id,
    r.slug,
    r.confidence,
    r.is_primary,
    r.source,
    count(*) as matched_patterns
  from normalized_businesses nb
  join rules r on true
  join lateral unnest(r.patterns) as p(pattern) on nb.searchable_text like '%' || public.gbk_normalize_text(p.pattern) || '%'
  group by nb.business_id, r.slug, r.confidence, r.is_primary, r.source
)
insert into public.business_category_mappings (
  business_id, category_id, confidence_score, is_primary, source
)
select
  s.business_id,
  bc.id,
  least(0.99, s.confidence + (least(s.matched_patterns, 3) * 0.02))::numeric,
  s.is_primary,
  s.source
from scored s
join public.business_categories bc on bc.slug = s.slug
on conflict (business_id, category_id) do update
set
  confidence_score = greatest(public.business_category_mappings.confidence_score, excluded.confidence_score),
  source = excluded.source,
  updated_at = now();

select
  (select count(*) from public.business_categories where slug in ('construction-supplies','industrial-supplies','metal-supplies','packaging-supplies','food-suppliers','chemical-supplies')) as supply_categories,
  (select count(*) from public.business_category_aliases bca join public.business_categories bc on bc.id = bca.category_id where bc.slug in ('construction-supplies','industrial-supplies','metal-supplies','packaging-supplies','food-suppliers','chemical-supplies')) as supply_aliases,
  (select count(*) from public.business_search_intents bsi join public.business_categories bc on bc.id = bsi.category_id where bc.slug in ('construction-supplies','industrial-supplies','metal-supplies','packaging-supplies','food-suppliers','chemical-supplies')) as supply_intents,
  (select count(*) from public.business_category_mappings bcm join public.business_categories bc on bc.id = bcm.category_id where bc.slug in ('construction-supplies','industrial-supplies','metal-supplies','packaging-supplies','food-suppliers','chemical-supplies')) as supply_mappings;
