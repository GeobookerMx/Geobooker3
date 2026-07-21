-- ============================================================================
-- GEOBOOKER + TT - Product, Material and Logistics Search Expansion
-- Objetivo: resolver busquedas hiper-especificas tipo:
--   "tornillo de cuerda de 3/8 cerca de mi"
--   "patio o pension para tracto con mercancia"
--   "truck parking secure yard near me"
-- Ejecutar despues de business_knowledge_graph_phase1.sql y supply_chain_search_expansion_2026_07.sql.
-- ============================================================================

insert into public.business_categories (
  slug, name_es, name_en, description_es, description_en, schema_org_type, icon, sort_order, search_priority
)
values
  ('hardware-store', 'Ferreteria y tornilleria', 'Hardware and Fasteners', 'Ferreterias, tlapalerias, tornillerias, herramientas, tornillos, tuercas y refacciones menores.', 'Hardware stores, fastener shops, tools, screws, bolts, nuts and small repair supplies.', 'HardwareStore', 'wrench', 205, 94),
  ('truck-parking-logistics', 'Patios y pensiones para carga', 'Truck Parking and Secure Yards', 'Patios logisticos, pensiones para tractocamiones, resguardo de mercancia, trailer parking y maniobras.', 'Truck parking, secure yards, freight yards, cargo storage and logistics yards.', 'ParkingFacility', 'truck', 206, 95),
  ('storage-spaces', 'Bodegas, storage y almacenes', 'Warehouses and Storage Spaces', 'Bodegas, storage, mini bodegas, almacenes logisticos y espacios para resguardo.', 'Warehouses, storage spaces, mini storage, logistics warehouses and secure inventory spaces.', 'SelfStorage', 'warehouse', 207, 92),
  ('transport-logistics', 'Transporte y logistica', 'Transport and Logistics', 'Fletes, transporte de carga, gruas, operadores logisticos y servicios para carga pesada.', 'Freight, cargo transport, tow trucks, logistics operators and heavy transport services.', 'LocalBusiness', 'route', 208, 92),
  ('auto-parts-heavy', 'Refacciones y taller pesado', 'Heavy Truck Parts and Service', 'Refacciones diesel, taller pesado, partes para tractocamion y atencion a flotillas.', 'Diesel parts, heavy truck service, truck parts and fleet support.', 'AutoPartsStore', 'truck', 209, 90)
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
    ('hardware-store', 'tornilleria', 'es', null, 'synonym', 100, 'Negocio probable para tornillos y medidas especificas'),
    ('hardware-store', 'tornillo', 'es', null, 'product', 98, 'Producto especifico; confirmar stock'),
    ('hardware-store', 'tornillo de cuerda 3/8', 'es', null, 'product', 99, 'Producto hiper-especifico; mapear a tornilleria/ferreteria'),
    ('hardware-store', 'tuerca', 'es', null, 'product', 94, 'Producto frecuente'),
    ('hardware-store', 'rondana', 'es', null, 'product', 92, 'Producto frecuente'),
    ('hardware-store', 'birlo', 'es', 'MX', 'product', 90, 'Producto frecuente MX'),
    ('hardware-store', 'taquete', 'es', 'MX', 'product', 90, 'Producto frecuente MX'),
    ('hardware-store', 'tlapaleria', 'es', 'MX', 'synonym', 96, 'Regionalismo MX'),
    ('hardware-store', 'fasteners', 'en', null, 'translation', 98, 'Busqueda ingles'),
    ('hardware-store', 'screws', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('hardware-store', 'bolts', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('hardware-store', 'nuts and bolts', 'en', null, 'translation', 96, 'Busqueda ingles'),

    ('truck-parking-logistics', 'patio logistico', 'es', null, 'synonym', 100, 'TT / carga pesada'),
    ('truck-parking-logistics', 'pension para tracto', 'es', 'MX', 'synonym', 99, 'Busqueda operacional'),
    ('truck-parking-logistics', 'pension para tractocamion', 'es', 'MX', 'synonym', 99, 'Busqueda operacional'),
    ('truck-parking-logistics', 'patio para tracto con mercancia', 'es', null, 'synonym', 99, 'Caso de uso TT'),
    ('truck-parking-logistics', 'resguardo de mercancia', 'es', null, 'synonym', 96, 'Seguridad/custodia'),
    ('truck-parking-logistics', 'estacionamiento para trailer', 'es', null, 'synonym', 94, 'Busqueda comun'),
    ('truck-parking-logistics', 'truck parking', 'en', null, 'translation', 100, 'Busqueda ingles'),
    ('truck-parking-logistics', 'secure yard', 'en', null, 'translation', 98, 'Busqueda ingles'),
    ('truck-parking-logistics', 'drop yard', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('truck-parking-logistics', 'freight yard', 'en', null, 'translation', 96, 'Busqueda ingles'),

    ('storage-spaces', 'bodega', 'es', null, 'synonym', 98, 'Storage'),
    ('storage-spaces', 'mini bodega', 'es', null, 'synonym', 94, 'Storage'),
    ('storage-spaces', 'almacen logistico', 'es', null, 'synonym', 96, 'Storage logistico'),
    ('storage-spaces', 'warehouse storage', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('storage-spaces', 'mini storage', 'en', null, 'translation', 94, 'Busqueda ingles'),

    ('transport-logistics', 'flete carga pesada', 'es', null, 'synonym', 96, 'TT / transporte'),
    ('transport-logistics', 'transporte de carga', 'es', null, 'synonym', 96, 'TT / transporte'),
    ('transport-logistics', 'grua para carga pesada', 'es', null, 'synonym', 94, 'TT / transporte'),
    ('transport-logistics', 'freight transport', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('transport-logistics', 'heavy cargo transport', 'en', null, 'translation', 94, 'Busqueda ingles'),

    ('auto-parts-heavy', 'refacciones diesel', 'es', null, 'product', 96, 'Refacciones carga pesada'),
    ('auto-parts-heavy', 'refaccionaria tractocamion', 'es', null, 'synonym', 96, 'Refacciones carga pesada'),
    ('auto-parts-heavy', 'taller pesado', 'es', null, 'synonym', 94, 'Servicio carga pesada'),
    ('auto-parts-heavy', 'truck parts', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('auto-parts-heavy', 'diesel repair', 'en', null, 'translation', 94, 'Busqueda ingles')
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
    ('hardware-store', 'tornillo de cuerda 3/8 cerca de mi', 'es', null, 99, 'product_need'),
    ('hardware-store', 'donde venden tornillos cerca', 'es', null, 96, 'voice_search'),
    ('hardware-store', 'fasteners near me', 'en', null, 96, 'voice_search'),
    ('hardware-store', 'nuts and bolts near me', 'en', null, 96, 'voice_search'),
    ('truck-parking-logistics', 'patio o pension para tracto con mercancia', 'es', null, 99, 'logistics_need'),
    ('truck-parking-logistics', 'pension para tractocamion cerca', 'es', 'MX', 98, 'voice_search'),
    ('truck-parking-logistics', 'truck parking near me', 'en', null, 98, 'voice_search'),
    ('truck-parking-logistics', 'secure yard for loaded truck', 'en', null, 98, 'logistics_need'),
    ('storage-spaces', 'necesito bodega para mercancia', 'es', null, 96, 'logistics_need'),
    ('storage-spaces', 'warehouse storage near me', 'en', null, 96, 'voice_search'),
    ('transport-logistics', 'necesito flete de carga pesada', 'es', null, 96, 'logistics_need'),
    ('auto-parts-heavy', 'busco refacciones para tractocamion', 'es', null, 96, 'product_need')
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
    ('hardware-store', 0.92::numeric, false, 'admin_reviewed', array['ferreteria','tornilleria','tlapaleria','tornillo','tuerca','herramientas','fasteners','screws','bolts']),
    ('truck-parking-logistics', 0.92::numeric, false, 'admin_reviewed', array['patio logistico','pension','tractocamion','trailer','resguardo','truck parking','secure yard','drop yard']),
    ('storage-spaces', 0.88::numeric, false, 'admin_reviewed', array['bodega','storage','warehouse','almacen','mini bodega','mini storage']),
    ('transport-logistics', 0.88::numeric, false, 'admin_reviewed', array['flete','transporte de carga','carga pesada','logistica','freight','cargo transport']),
    ('auto-parts-heavy', 0.86::numeric, false, 'admin_reviewed', array['refacciones diesel','tractocamion','taller pesado','truck parts','diesel repair'])
), normalized_businesses as (
  select
    b.id as business_id,
    public.gbk_normalize_text(
      coalesce(b.name, '') || ' ' ||
      coalesce(b.category, '') || ' ' ||
      coalesce(b.subcategory, '') || ' ' ||
      coalesce(b.description, '') || ' ' ||
      coalesce(b.address, '')
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
  (select count(*) from public.business_categories where slug in ('hardware-store','truck-parking-logistics','storage-spaces','transport-logistics','auto-parts-heavy')) as tt_product_categories,
  (select count(*) from public.business_category_aliases bca join public.business_categories bc on bc.id = bca.category_id where bc.slug in ('hardware-store','truck-parking-logistics','storage-spaces','transport-logistics','auto-parts-heavy')) as tt_product_aliases,
  (select count(*) from public.business_search_intents bsi join public.business_categories bc on bc.id = bsi.category_id where bc.slug in ('hardware-store','truck-parking-logistics','storage-spaces','transport-logistics','auto-parts-heavy')) as tt_product_intents,
  (select count(*) from public.business_category_mappings bcm join public.business_categories bc on bc.id = bcm.category_id where bc.slug in ('hardware-store','truck-parking-logistics','storage-spaces','transport-logistics','auto-parts-heavy')) as tt_product_mappings;
