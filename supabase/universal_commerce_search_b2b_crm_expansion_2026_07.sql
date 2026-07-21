-- ============================================================================
-- GEOBOOKER - Universal Commerce Search + B2B CRM Readiness Expansion
-- Ejecutar despues de:
--   1) business_knowledge_graph_phase1.sql
--   2) seo_intent_dictionary_expansion.sql
--   3) supply_chain_search_expansion_2026_07.sql
--   4) tt_product_material_search_expansion_2026_07.sql
-- Objetivo:
--   - Ampliar busqueda por productos, componentes, servicios e industrias.
--   - Reforzar CRM B2B con segmentacion/readiness sin enviar mensajes automaticamente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Categorias comerciales universales
-- ---------------------------------------------------------------------------
insert into public.business_categories (
  slug, name_es, name_en, description_es, description_en, schema_org_type, icon, sort_order, search_priority
)
values
  ('medical-supplies', 'Insumos medicos y equipo de salud', 'Medical Supplies and Healthcare Equipment', 'Proveedores de material de curacion, consumibles medicos, equipo medico y suministros para clinicas.', 'Medical supplies, healthcare consumables, medical equipment and clinic suppliers.', 'MedicalBusiness', 'stethoscope', 230, 91),
  ('beauty-supplies', 'Cosmeticos y productos de belleza', 'Beauty Supplies', 'Cosmeticos, productos profesionales para salon, unas, maquillaje, cabello y estetica.', 'Cosmetics, salon supplies, nails, makeup, hair and beauty products.', 'HealthAndBeautyBusiness', 'sparkles', 231, 88),
  ('office-supplies', 'Papeleria, oficina e impresion', 'Office Supplies and Printing', 'Papelerias, copias, impresiones, toner, cartuchos, utiles de oficina e imprentas.', 'Office supplies, copies, printing, toner, cartridges and print shops.', 'Store', 'printer', 232, 86),
  ('pet-supplies', 'Mascotas y alimento', 'Pet Supplies', 'Alimento para mascotas, accesorios, veterinaria, vacunas y servicios para animales.', 'Pet food, pet supplies, veterinary services and animal care.', 'PetStore', 'paw', 233, 88),
  ('auto-parts', 'Autopartes y refacciones', 'Auto Parts', 'Refaccionarias, autopartes, baterias, balatas, filtros, accesorios y talleres relacionados.', 'Auto parts, car batteries, brake pads, filters, accessories and related repair shops.', 'AutoPartsStore', 'car', 234, 89),
  ('electronics-repair', 'Electronica y reparacion celular', 'Electronics and Phone Repair', 'Reparacion de celulares, accesorios, componentes electronicos, computo y soporte tecnico.', 'Phone repair, electronics accessories, electronic components, computer support and tech service.', 'ElectronicsStore', 'smartphone', 235, 87),
  ('cleaning-supplies', 'Limpieza y sanitizacion', 'Cleaning and Janitorial Supplies', 'Productos de limpieza, sanitizacion, limpieza industrial, desinfectantes y servicios de limpieza.', 'Cleaning supplies, janitorial products, sanitization, disinfectants and cleaning services.', 'Store', 'spray-can', 236, 86),
  ('safety-equipment', 'Equipo de seguridad industrial', 'Safety and PPE Equipment', 'Equipo de proteccion personal, cascos, chalecos, botas, arneses y seguridad industrial.', 'PPE, helmets, vests, industrial boots, harnesses and safety equipment.', 'Store', 'shield', 237, 88),
  ('restaurant-equipment', 'Equipo para restaurante', 'Restaurant Equipment', 'Equipo de cocina industrial, refrigeracion comercial, mesas de acero y suministros para restaurante.', 'Commercial kitchen equipment, restaurant supplies, commercial refrigeration and foodservice equipment.', 'Store', 'utensils', 238, 88),
  ('event-services', 'Eventos, mobiliario y produccion', 'Event Services and Rentals', 'Renta de mobiliario, sonido, iluminacion, carpas, produccion y servicios para eventos.', 'Event rentals, furniture, sound, lighting, tents and event production.', 'EventVenue', 'calendar', 239, 84),
  ('agro-supplies', 'Agroinsumos y suministros rurales', 'Agricultural Supplies', 'Fertilizantes, semillas, agroquimicos, riego, forraje y suministros agropecuarios.', 'Fertilizers, seeds, agrochemicals, irrigation, feed and agricultural supplies.', 'Store', 'leaf', 240, 84)
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

-- ---------------------------------------------------------------------------
-- 2. Alias, productos, traducciones y modismos por vertical
-- ---------------------------------------------------------------------------
with categories as (
  select id, slug from public.business_categories
), aliases(slug, alias, language, country, alias_type, weight, notes) as (
  values
    ('medical-supplies', 'insumos medicos', 'es', null, 'synonym', 98, 'Proveedor salud'),
    ('medical-supplies', 'material de curacion', 'es', null, 'product', 96, 'Producto probable'),
    ('medical-supplies', 'jeringas', 'es', null, 'product', 94, 'Producto probable'),
    ('medical-supplies', 'guantes nitrilo', 'es', null, 'product', 94, 'Producto probable'),
    ('medical-supplies', 'silla de ruedas', 'es', null, 'product', 92, 'Equipo medico'),
    ('medical-supplies', 'medical supplies', 'en', null, 'translation', 98, 'Busqueda ingles'),
    ('medical-supplies', 'surgical supplies', 'en', null, 'translation', 94, 'Busqueda ingles'),

    ('beauty-supplies', 'cosmeticos', 'es', null, 'product', 94, 'Belleza'),
    ('beauty-supplies', 'maquillaje profesional', 'es', null, 'product', 94, 'Belleza'),
    ('beauty-supplies', 'pestanas', 'es', null, 'product', 90, 'Belleza'),
    ('beauty-supplies', 'unas acrilicas', 'es', null, 'product', 90, 'Belleza'),
    ('beauty-supplies', 'beauty supply', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('beauty-supplies', 'makeup artist', 'en', null, 'translation', 92, 'Servicio cercano'),

    ('office-supplies', 'papeleria oficina', 'es', null, 'synonym', 92, 'Oficina'),
    ('office-supplies', 'toner', 'es', null, 'product', 92, 'Consumible'),
    ('office-supplies', 'cartuchos impresora', 'es', null, 'product', 92, 'Consumible'),
    ('office-supplies', 'copias impresiones', 'es', null, 'synonym', 92, 'Servicio'),
    ('office-supplies', 'office supplies', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('office-supplies', 'print shop', 'en', null, 'translation', 92, 'Busqueda ingles'),

    ('pet-supplies', 'croquetas', 'es', null, 'product', 94, 'Mascotas'),
    ('pet-supplies', 'alimento para perro', 'es', null, 'product', 94, 'Mascotas'),
    ('pet-supplies', 'alimento para gato', 'es', null, 'product', 94, 'Mascotas'),
    ('pet-supplies', 'veterinaria', 'es', null, 'synonym', 92, 'Servicio relacionado'),
    ('pet-supplies', 'pet food', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('pet-supplies', 'pet supplies', 'en', null, 'translation', 96, 'Busqueda ingles'),

    ('auto-parts', 'autopartes', 'es', null, 'synonym', 96, 'Auto'),
    ('auto-parts', 'refaccionaria', 'es', null, 'synonym', 96, 'Auto'),
    ('auto-parts', 'balatas', 'es', null, 'product', 94, 'Auto'),
    ('auto-parts', 'bujias', 'es', null, 'product', 92, 'Auto'),
    ('auto-parts', 'bateria auto', 'es', null, 'product', 94, 'Auto'),
    ('auto-parts', 'auto parts', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('auto-parts', 'brake pads', 'en', null, 'translation', 92, 'Busqueda ingles'),

    ('electronics-repair', 'reparacion celular', 'es', null, 'synonym', 96, 'Electronica'),
    ('electronics-repair', 'pantalla iphone', 'es', null, 'product', 92, 'Producto probable'),
    ('electronics-repair', 'componentes electronicos', 'es', null, 'product', 92, 'Electronica'),
    ('electronics-repair', 'cargador celular', 'es', null, 'product', 90, 'Accesorio'),
    ('electronics-repair', 'phone repair', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('electronics-repair', 'electronics repair', 'en', null, 'translation', 94, 'Busqueda ingles'),

    ('cleaning-supplies', 'productos de limpieza', 'es', null, 'product', 96, 'Limpieza'),
    ('cleaning-supplies', 'sanitizante', 'es', null, 'product', 92, 'Limpieza'),
    ('cleaning-supplies', 'limpieza industrial', 'es', null, 'synonym', 92, 'Servicio'),
    ('cleaning-supplies', 'janitorial supplies', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('cleaning-supplies', 'cleaning chemicals', 'en', null, 'translation', 92, 'Busqueda ingles'),

    ('safety-equipment', 'equipo de seguridad', 'es', null, 'synonym', 96, 'Industrial'),
    ('safety-equipment', 'epp', 'es', null, 'synonym', 96, 'Industrial'),
    ('safety-equipment', 'casco seguridad', 'es', null, 'product', 92, 'Industrial'),
    ('safety-equipment', 'botas industriales', 'es', null, 'product', 92, 'Industrial'),
    ('safety-equipment', 'ppe', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('safety-equipment', 'safety equipment', 'en', null, 'translation', 96, 'Busqueda ingles'),

    ('restaurant-equipment', 'equipo para restaurante', 'es', null, 'synonym', 96, 'Restaurante B2B'),
    ('restaurant-equipment', 'cocina industrial', 'es', null, 'synonym', 94, 'Restaurante B2B'),
    ('restaurant-equipment', 'freidora industrial', 'es', null, 'product', 92, 'Restaurante B2B'),
    ('restaurant-equipment', 'refrigerador comercial', 'es', null, 'product', 92, 'Restaurante B2B'),
    ('restaurant-equipment', 'restaurant equipment', 'en', null, 'translation', 96, 'Busqueda ingles'),
    ('restaurant-equipment', 'commercial kitchen', 'en', null, 'translation', 94, 'Busqueda ingles'),

    ('event-services', 'renta mesas y sillas', 'es', null, 'synonym', 94, 'Eventos'),
    ('event-services', 'sonido para eventos', 'es', null, 'synonym', 92, 'Eventos'),
    ('event-services', 'carpas para eventos', 'es', null, 'product', 90, 'Eventos'),
    ('event-services', 'party rentals', 'en', null, 'translation', 94, 'Busqueda ingles'),
    ('event-services', 'event production', 'en', null, 'translation', 92, 'Busqueda ingles'),

    ('agro-supplies', 'agroinsumos', 'es', null, 'synonym', 96, 'Agro'),
    ('agro-supplies', 'fertilizantes', 'es', null, 'product', 94, 'Agro'),
    ('agro-supplies', 'semillas', 'es', null, 'product', 92, 'Agro'),
    ('agro-supplies', 'riego agricola', 'es', null, 'product', 90, 'Agro'),
    ('agro-supplies', 'agricultural supplies', 'en', null, 'translation', 94, 'Busqueda ingles'),
    ('agro-supplies', 'farm supplies', 'en', null, 'translation', 94, 'Busqueda ingles')
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

-- ---------------------------------------------------------------------------
-- 3. Intenciones de busqueda reales: voz, producto y necesidad
-- ---------------------------------------------------------------------------
with categories as (
  select id, slug from public.business_categories
), intents(slug, phrase, language, country, weight, intent_type) as (
  values
    ('medical-supplies', 'donde compro guantes de nitrilo cerca', 'es', null, 94, 'product_need'),
    ('medical-supplies', 'medical supplies near me', 'en', null, 94, 'voice_search'),
    ('beauty-supplies', 'necesito maquillista para evento', 'es', null, 92, 'service_need'),
    ('beauty-supplies', 'beauty supply near me', 'en', null, 94, 'voice_search'),
    ('office-supplies', 'donde imprimen cerca de mi', 'es', null, 92, 'voice_search'),
    ('office-supplies', 'office supplies near me', 'en', null, 94, 'voice_search'),
    ('pet-supplies', 'donde venden croquetas cerca', 'es', null, 94, 'product_need'),
    ('pet-supplies', 'pet food near me', 'en', null, 94, 'voice_search'),
    ('auto-parts', 'busco balatas para mi carro', 'es', null, 94, 'product_need'),
    ('auto-parts', 'auto parts near me', 'en', null, 94, 'voice_search'),
    ('electronics-repair', 'me arreglan la pantalla del celular cerca', 'es', null, 94, 'problem'),
    ('electronics-repair', 'phone repair near me', 'en', null, 94, 'voice_search'),
    ('cleaning-supplies', 'productos de limpieza por mayoreo', 'es', null, 92, 'product_need'),
    ('cleaning-supplies', 'janitorial supplies near me', 'en', null, 92, 'voice_search'),
    ('safety-equipment', 'donde compro botas industriales y casco', 'es', null, 94, 'product_need'),
    ('safety-equipment', 'ppe supplier near me', 'en', null, 94, 'voice_search'),
    ('restaurant-equipment', 'equipo para abrir restaurante', 'es', null, 94, 'business_need'),
    ('restaurant-equipment', 'restaurant equipment near me', 'en', null, 94, 'voice_search'),
    ('event-services', 'renta de mesas y sillas para evento', 'es', null, 92, 'service_need'),
    ('event-services', 'party rentals near me', 'en', null, 92, 'voice_search'),
    ('agro-supplies', 'donde compro fertilizante y semillas', 'es', null, 92, 'product_need'),
    ('agro-supplies', 'farm supplies near me', 'en', null, 92, 'voice_search')
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
);

-- ---------------------------------------------------------------------------
-- 4. Backfill heuristico a negocios existentes
-- ---------------------------------------------------------------------------
with rules(slug, confidence, is_primary, source, patterns) as (
  values
    ('medical-supplies', 0.86::numeric, false, 'admin_reviewed', array['insumos medicos','equipo medico','material de curacion','jeringa','guantes nitrilo','farmacia','clinica']),
    ('beauty-supplies', 0.84::numeric, false, 'admin_reviewed', array['cosmetico','maquillaje','beauty','salon','estetica','unas','pestanas']),
    ('office-supplies', 0.84::numeric, false, 'admin_reviewed', array['papeleria','impresion','copias','toner','cartucho','imprenta','office supplies']),
    ('pet-supplies', 0.84::numeric, false, 'admin_reviewed', array['veterinaria','mascota','croquetas','pet','animal hospital']),
    ('auto-parts', 0.86::numeric, false, 'admin_reviewed', array['refaccionaria','autopartes','balatas','bateria','taller mecanico','auto parts']),
    ('electronics-repair', 0.84::numeric, false, 'admin_reviewed', array['celular','electronica','reparacion celular','computo','phone repair','electronics']),
    ('cleaning-supplies', 0.82::numeric, false, 'admin_reviewed', array['limpieza','sanitizacion','desinfectante','cleaning','janitorial']),
    ('safety-equipment', 0.84::numeric, false, 'admin_reviewed', array['seguridad industrial','epp','casco','botas industriales','ppe','safety equipment']),
    ('restaurant-equipment', 0.84::numeric, false, 'admin_reviewed', array['equipo restaurante','cocina industrial','restaurant equipment','refrigerador comercial']),
    ('event-services', 0.82::numeric, false, 'admin_reviewed', array['eventos','renta mesas','renta sillas','sonido','party rentals']),
    ('agro-supplies', 0.82::numeric, false, 'admin_reviewed', array['agro','fertilizante','semillas','forraje','agricultural supplies'])
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

-- ---------------------------------------------------------------------------
-- 5. CRM B2B readiness: capa informativa para vender/operar pilotos CRM
-- ---------------------------------------------------------------------------
alter table public.marketing_contacts
  add column if not exists country text,
  add column if not exists country_code text,
  add column if not exists industry text,
  add column if not exists category text,
  add column if not exists b2b_segment text,
  add column if not exists crm_readiness_score integer default 0,
  add column if not exists compliance_risk text default 'medium',
  add column if not exists next_best_action text,
  add column if not exists campaign_fit_notes text,
  add column if not exists channel_recommendation text default 'email';

create index if not exists idx_marketing_contacts_b2b_segment
  on public.marketing_contacts (b2b_segment);
create index if not exists idx_marketing_contacts_readiness
  on public.marketing_contacts (crm_readiness_score desc);
create index if not exists idx_marketing_contacts_compliance_risk
  on public.marketing_contacts (compliance_risk);

create or replace function public.refresh_crm_b2b_readiness()
returns table(updated_contacts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  update public.marketing_contacts mc
  set
    b2b_segment = case
      when gbk_normalize_text(coalesce(mc.industry, '') || ' ' || coalesce(mc.category, '') || ' ' || coalesce(mc.company_name, '') || ' ' || coalesce(mc.notes, '')) ~ '(logistic|transporte|flete|truck|storage|bodega|patio|tracto)' then 'logistics_transport'
      when gbk_normalize_text(coalesce(mc.industry, '') || ' ' || coalesce(mc.category, '') || ' ' || coalesce(mc.company_name, '') || ' ' || coalesce(mc.notes, '')) ~ '(industrial|manufactura|maquinaria|refaccion|metal|acero|seguridad)' then 'industrial_supplies'
      when gbk_normalize_text(coalesce(mc.industry, '') || ' ' || coalesce(mc.category, '') || ' ' || coalesce(mc.company_name, '') || ' ' || coalesce(mc.notes, '')) ~ '(restaurante|food|alimento|cocina|abarrotes|hospitality)' then 'food_hospitality'
      when gbk_normalize_text(coalesce(mc.industry, '') || ' ' || coalesce(mc.category, '') || ' ' || coalesce(mc.company_name, '') || ' ' || coalesce(mc.notes, '')) ~ '(clinica|medic|salud|farmacia|dental|doctor)' then 'healthcare'
      when gbk_normalize_text(coalesce(mc.industry, '') || ' ' || coalesce(mc.category, '') || ' ' || coalesce(mc.company_name, '') || ' ' || coalesce(mc.notes, '')) ~ '(belleza|salon|estetica|beauty|spa|barber)' then 'beauty_wellness'
      when gbk_normalize_text(coalesce(mc.industry, '') || ' ' || coalesce(mc.category, '') || ' ' || coalesce(mc.company_name, '') || ' ' || coalesce(mc.notes, '')) ~ '(auto|taller|refaccionaria|mecanico|llantera)' then 'automotive'
      else coalesce(nullif(mc.b2b_segment, ''), 'local_business')
    end,
    crm_readiness_score = least(100,
      (case when coalesce(mc.email, '') <> '' then 25 else 0 end) +
      (case when coalesce(mc.phone, '') <> '' then 20 else 0 end) +
      (case when coalesce(mc.website, '') <> '' then 10 else 0 end) +
      (case when coalesce(mc.city, '') <> '' then 10 else 0 end) +
      (case when coalesce(mc.state, '') <> '' then 10 else 0 end) +
      (case when coalesce(mc.industry, mc.category, '') <> '' then 10 else 0 end) +
      (case when coalesce(mc.tier, '') in ('AAA', 'AA') then 10 when coalesce(mc.tier, '') = 'A' then 6 else 3 end) +
      (case when coalesce(mc.source, '') in ('apify', 'google_places', 'csv') then 5 else 0 end)
    ),
    compliance_risk = case
      when coalesce(mc.email, '') = '' and coalesce(mc.phone, '') = '' then 'no_contact'
      when upper(coalesce(mc.country_code, mc.country, '')) in ('CN') then 'restricted'
      when upper(coalesce(mc.country_code, mc.country, '')) in ('US','USA','CA','CAN','GB','UK','DE','FR','NL','SE','NO','DK','FI','AU','NZ','CH','AT') then 'medium'
      when coalesce(mc.source, '') in ('apify', 'google_places', 'csv') then 'low'
      else 'medium'
    end,
    channel_recommendation = case
      when coalesce(mc.email, '') = '' and coalesce(mc.phone, '') <> '' then 'whatsapp'
      when coalesce(mc.email, '') <> '' and upper(coalesce(mc.country_code, mc.country, '')) in ('US','USA','CA','CAN','GB','UK','DE','FR','NL','SE','NO','DK','FI','AU','NZ','CH','AT') then 'email'
      when coalesce(mc.phone, '') <> '' and upper(coalesce(mc.country_code, mc.country, 'MX')) in ('MX','MEX','BR','CO','AR','PE','CL','EC','ES','PT','IT','IN','AE','SA') then 'whatsapp'
      when coalesce(mc.email, '') <> '' then 'email'
      else 'no_contact'
    end,
    next_best_action = case
      when coalesce(mc.email, '') = '' and coalesce(mc.phone, '') = '' then 'Enriquecer contacto antes de campana'
      when upper(coalesce(mc.country_code, mc.country, '')) in ('US','USA','CA','CAN','GB','UK','DE','FR','NL','SE','NO','DK','FI','AU','NZ','CH','AT') then 'Usar email B2B con baja/supresion visible y copy consultivo'
      when coalesce(mc.phone, '') <> '' then 'Priorizar WhatsApp asistido o seguimiento manual controlado'
      else 'Usar email y validar respuesta antes de follow-up'
    end,
    campaign_fit_notes = 'Segmento ' || coalesce(mc.b2b_segment, 'local_business') || ' | score calculado por contacto, fuente, ubicacion y canal disponible',
    updated_at = now();

  get diagnostics v_updated = row_count;
  return query select v_updated;
end;
$$;

select * from public.refresh_crm_b2b_readiness();

create or replace view public.crm_b2b_readiness_v1
with (security_invoker = true)
as
select
  b2b_segment,
  channel_recommendation,
  compliance_risk,
  count(*) as total_contacts,
  count(*) filter (where crm_readiness_score >= 75) as ready_high,
  count(*) filter (where crm_readiness_score between 50 and 74) as ready_medium,
  count(*) filter (where crm_readiness_score < 50) as needs_enrichment,
  count(*) filter (where coalesce(email, '') <> '') as with_email,
  count(*) filter (where coalesce(phone, '') <> '') as with_phone,
  round(avg(crm_readiness_score), 0) as avg_readiness_score
from public.marketing_contacts
group by b2b_segment, channel_recommendation, compliance_risk
order by total_contacts desc;

grant select on public.crm_b2b_readiness_v1 to authenticated;
grant execute on function public.refresh_crm_b2b_readiness() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Verificacion final
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.business_categories where slug in ('medical-supplies','beauty-supplies','office-supplies','pet-supplies','auto-parts','electronics-repair','cleaning-supplies','safety-equipment','restaurant-equipment','event-services','agro-supplies')) as universal_commerce_categories,
  (select count(*) from public.business_category_aliases bca join public.business_categories bc on bc.id = bca.category_id where bc.slug in ('medical-supplies','beauty-supplies','office-supplies','pet-supplies','auto-parts','electronics-repair','cleaning-supplies','safety-equipment','restaurant-equipment','event-services','agro-supplies')) as universal_commerce_aliases,
  (select count(*) from public.business_search_intents bsi join public.business_categories bc on bc.id = bsi.category_id where bc.slug in ('medical-supplies','beauty-supplies','office-supplies','pet-supplies','auto-parts','electronics-repair','cleaning-supplies','safety-equipment','restaurant-equipment','event-services','agro-supplies')) as universal_commerce_intents,
  (select count(*) from public.crm_b2b_readiness_v1) as crm_b2b_readiness_rows;

