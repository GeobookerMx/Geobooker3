-- ============================================================================
-- GEOBOOKER BUSINESS KNOWLEDGE GRAPH - BACKFILL DE MAPPINGS
-- Vincula negocios existentes a categorias canonicas con reglas heuristicas.
-- Ejecutar despues de:
--   1) business_knowledge_graph_phase1.sql
--   2) business_knowledge_graph_seed_core.sql
-- ============================================================================

with normalized_businesses as (
  select
    b.id as business_id,
    public.gbk_normalize_text(coalesce(b.name, '')) as name_norm,
    public.gbk_normalize_text(coalesce(b.category, '')) as category_norm,
    public.gbk_normalize_text(coalesce(b.subcategory, '')) as subcategory_norm,
    public.gbk_normalize_text(array_to_string(coalesce(b.tags, '{}'), ' ')) as tags_norm
  from public.businesses b
  where coalesce(b.status, 'approved') in ('approved', 'active', 'published', 'pending')
),
rules as (
  select 'tire-service'::text as slug, 0.97::numeric as confidence, true as is_primary, 'admin_reviewed'::text as source, array[
    'vulcanizadora', 'talacha', 'vulca', 'llanta', 'ponchadura', 'tire repair', 'flat tire'
  ]::text[] as patterns
  union all
  select 'locksmith', 0.97, true, 'admin_reviewed', array[
    'cerrajero', 'cerradura', 'llaves', 'abrir puerta', 'locksmith', 'locked out'
  ]::text[]
  union all
  select 'plumber', 0.96, true, 'admin_reviewed', array[
    'plomer', 'plomeria', 'fontaner', 'fuga de agua', 'drenaje', 'tuberia', 'tuberia'
  ]::text[]
  union all
  select 'electrician', 0.96, true, 'admin_reviewed', array[
    'electricista', 'electrico', 'electrica', 'corto circuito', 'breaker', 'wiring'
  ]::text[]
  union all
  select 'mechanic', 0.96, true, 'admin_reviewed', array[
    'taller mecan', 'mecanic', 'afinacion', 'motor', 'auto repair', 'car service', 'diesel'
  ]::text[]
  union all
  select 'tow-truck', 0.95, true, 'admin_reviewed', array[
    'grua', 'auxilio vial', 'arrastre', 'remolque', 'tow truck', 'roadside assistance'
  ]::text[]
  union all
  select 'pharmacy', 0.97, true, 'admin_reviewed', array[
    'farmacia', 'medicina', 'medicamentos', 'pharmacy', 'drugstore'
  ]::text[]
  union all
  select 'doctor', 0.90, true, 'admin_reviewed', array[
    'doctor', 'medico', 'clinica', 'consultorio', 'hospital', 'physician', 'medical office'
  ]::text[]
  union all
  select 'dentist', 0.95, true, 'admin_reviewed', array[
    'dentista', 'dental', 'odont', 'ortodoncia', 'tooth'
  ]::text[]
  union all
  select 'veterinarian', 0.95, true, 'admin_reviewed', array[
    'veterin', 'pet clinic', 'animal hospital', 'mascotas'
  ]::text[]
  union all
  select 'restaurant', 0.95, true, 'admin_reviewed', array[
    'restaurante', 'restaurant', 'taquer', 'pizza', 'mariscos', 'comida', 'food truck', 'sushi'
  ]::text[]
  union all
  select 'coffee-shop', 0.93, true, 'admin_reviewed', array[
    'cafeter', 'coffee', 'espresso', 'brunch', 'cafe'
  ]::text[]
  union all
  select 'barbershop', 0.94, true, 'admin_reviewed', array[
    'barber', 'barberia', 'barbershop', 'fade', 'corte de cabello'
  ]::text[]
  union all
  select 'beauty-salon', 0.92, true, 'admin_reviewed', array[
    'estetica', 'salon de belleza', 'beauty salon', 'unas', 'nail', 'spa', 'maquillaje'
  ]::text[]
  union all
  select 'laundry', 0.92, true, 'admin_reviewed', array[
    'lavanderia', 'tintoreria', 'laundry', 'laundromat', 'dry cleaning'
  ]::text[]
  union all
  select 'hardware-store', 0.94, true, 'admin_reviewed', array[
    'ferreter', 'tlapaler', 'hardware', 'herramientas', 'tools'
  ]::text[]
  union all
  select 'pest-control', 0.92, true, 'admin_reviewed', array[
    'fumig', 'plagas', 'cucarachas', 'chinches', 'pest control', 'exterminator'
  ]::text[]
  union all
  select 'moving-service', 0.92, true, 'admin_reviewed', array[
    'mudanza', 'flete', 'movers', 'relocation', 'transporte de muebles'
  ]::text[]
  union all
  select 'auto-parts', 0.93, true, 'admin_reviewed', array[
    'refaccion', 'autopart', 'auto parts', 'repuestos'
  ]::text[]
  union all
  select 'warehouse', 0.91, true, 'admin_reviewed', array[
    'bodega', 'almacen', 'warehouse', 'storage'
  ]::text[]
),
rule_matches as (
  select
    nb.business_id,
    r.slug,
    r.confidence,
    r.is_primary,
    r.source,
    count(*) as matched_patterns
  from normalized_businesses nb
  join rules r on exists (
    select 1
    from unnest(r.patterns) as pattern
    where nb.name_norm like '%' || pattern || '%'
       or nb.category_norm like '%' || pattern || '%'
       or nb.subcategory_norm like '%' || pattern || '%'
       or nb.tags_norm like '%' || pattern || '%'
  )
  group by nb.business_id, r.slug, r.confidence, r.is_primary, r.source
),
scored_matches as (
  select
    rm.*,
    row_number() over (
      partition by rm.business_id
      order by rm.matched_patterns desc, rm.confidence desc, rm.slug asc
    ) as rn
  from rule_matches rm
),
chosen_matches as (
  select
    sm.business_id,
    bc.id as category_id,
    least(sm.confidence + ((sm.matched_patterns - 1) * 0.01), 0.99)::numeric(5,2) as confidence_score,
    case when sm.rn = 1 then true else false end as is_primary,
    sm.source,
    'Backfill heuristico por category/subcategory/name/tags'::text as notes
  from scored_matches sm
  join public.business_categories bc
    on bc.slug = sm.slug
  where sm.matched_patterns >= 1
)
insert into public.business_category_mappings (
  business_id,
  category_id,
  confidence_score,
  is_primary,
  source,
  notes
)
select
  cm.business_id,
  cm.category_id,
  cm.confidence_score,
  cm.is_primary,
  cm.source,
  cm.notes
from chosen_matches cm
on conflict (business_id, category_id) do update
set
  confidence_score = greatest(public.business_category_mappings.confidence_score, excluded.confidence_score),
  is_primary = case
    when excluded.is_primary = true then true
    else public.business_category_mappings.is_primary
  end,
  source = excluded.source,
  notes = excluded.notes,
  updated_at = now();

-- ============================================================================
-- VERIFICACION RAPIDA
-- ============================================================================
-- select bc.slug, count(*) as total
-- from public.business_category_mappings bcm
-- join public.business_categories bc on bc.id = bcm.category_id
-- group by bc.slug
-- order by total desc;
