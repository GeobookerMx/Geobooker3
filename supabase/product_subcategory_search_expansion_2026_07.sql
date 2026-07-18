-- ============================================================================
-- GEOBOOKER - Product/Subcategory Search Expansion
-- Objetivo: que busquedas por producto o subservicio apunten a negocios cercanos
-- probables sin prometer inventario, disponibilidad, diagnostico o resultado.
-- Ejecutar despues de business_knowledge_graph_phase1.sql.
-- ============================================================================

with categories as (
  select id, slug from public.business_categories
), aliases(slug, alias, language, country, alias_type, weight, notes) as (
  values
    -- Farmacia: productos comunes como intencion de compra cercana.
    ('pharmacy', 'medicamento', 'es', null, 'product', 92, 'Producto generico; confirmar disponibilidad con farmacia'),
    ('pharmacy', 'medicamentos', 'es', null, 'product', 92, 'Producto generico; confirmar disponibilidad con farmacia'),
    ('pharmacy', 'omeprazol', 'es', null, 'product', 96, 'Medicamento solicitado; no implica stock ni recomendacion medica'),
    ('pharmacy', 'paracetamol', 'es', null, 'product', 94, 'Medicamento solicitado; no implica stock ni recomendacion medica'),
    ('pharmacy', 'ibuprofeno', 'es', null, 'product', 94, 'Medicamento solicitado; no implica stock ni recomendacion medica'),
    ('pharmacy', 'loratadina', 'es', null, 'product', 92, 'Medicamento solicitado; no implica stock ni recomendacion medica'),
    ('pharmacy', 'antigripal', 'es', null, 'product', 90, 'Producto de farmacia; confirmar disponibilidad'),
    ('pharmacy', 'suero oral', 'es', null, 'product', 90, 'Producto de farmacia; confirmar disponibilidad'),
    ('pharmacy', 'vitaminas', 'es', null, 'product', 88, 'Producto de farmacia; confirmar disponibilidad'),
    ('pharmacy', 'over the counter medicine', 'en', null, 'translation', 88, 'Busqueda ingles'),
    ('pharmacy', 'medicine store', 'en', null, 'translation', 90, 'Busqueda ingles'),

    -- Belleza: subservicios y profesion asociada.
    ('beauty-salon', 'maquillaje', 'es', null, 'product', 96, 'Subservicio de belleza'),
    ('beauty-salon', 'maquillista', 'es', null, 'profession', 98, 'Profesion/servicio buscado'),
    ('beauty-salon', 'maquillaje social', 'es', null, 'product', 92, 'Subservicio de belleza'),
    ('beauty-salon', 'maquillaje de novia', 'es', null, 'product', 94, 'Subservicio de belleza'),
    ('beauty-salon', 'peinado', 'es', null, 'product', 90, 'Subservicio de belleza'),
    ('beauty-salon', 'pestanas', 'es', null, 'product', 90, 'Subservicio de belleza'),
    ('beauty-salon', 'cejas', 'es', null, 'product', 88, 'Subservicio de belleza'),
    ('beauty-salon', 'depilacion', 'es', null, 'product', 88, 'Subservicio de belleza'),
    ('beauty-salon', 'makeup artist', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('beauty-salon', 'makeup service', 'en', null, 'translation', 92, 'Busqueda ingles'),
    ('beauty-salon', 'lash studio', 'en', null, 'translation', 88, 'Busqueda ingles'),
    ('beauty-salon', 'brow studio', 'en', null, 'translation', 86, 'Busqueda ingles')
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
    ('pharmacy', 'donde consigo omeprazol', 'es', null, 96, 'voice_search'),
    ('pharmacy', 'busco omeprazol cerca', 'es', null, 96, 'voice_search'),
    ('pharmacy', 'farmacia con medicamentos cerca', 'es', null, 92, 'voice_search'),
    ('beauty-salon', 'busco una maquillista', 'es', null, 98, 'voice_search'),
    ('beauty-salon', 'necesito maquillaje para evento', 'es', null, 94, 'need_state'),
    ('beauty-salon', 'maquillaje de novia cerca', 'es', null, 94, 'voice_search'),
    ('beauty-salon', 'makeup artist near me', 'en', null, 94, 'voice_search')
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

select
  (select count(*) from public.business_category_aliases bca join public.business_categories bc on bc.id = bca.category_id where bc.slug in ('pharmacy','beauty-salon') and bca.alias in ('omeprazol','maquillista','maquillaje de novia','makeup artist')) as product_service_aliases,
  (select count(*) from public.business_search_intents bsi join public.business_categories bc on bc.id = bsi.category_id where bc.slug in ('pharmacy','beauty-salon') and bsi.intent_phrase in ('donde consigo omeprazol','busco una maquillista','makeup artist near me')) as product_service_intents;
