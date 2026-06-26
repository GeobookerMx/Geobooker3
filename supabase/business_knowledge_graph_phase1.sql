-- ============================================================================
-- GEOBOOKER BUSINESS KNOWLEDGE GRAPH - PHASE 1
-- Base estructural para categorias canonicas, alias, intenciones, SEO y logs.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================

create extension if not exists unaccent;
create extension if not exists pg_trgm;

create or replace function public.gbk_normalize_text(input_text text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(lower(unaccent(coalesce(input_text, ''))), '\s+', ' ', 'g'));
$$;

create table if not exists public.business_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.business_categories(id) on delete set null,
  slug text not null unique,
  name_es text not null,
  name_en text,
  description_es text,
  description_en text,
  schema_org_type text,
  icon text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  search_priority integer not null default 50,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_category_aliases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.business_categories(id) on delete cascade,
  alias text not null,
  alias_normalized text not null,
  language text not null default 'es',
  country text,
  region text,
  alias_type text not null default 'synonym',
  weight integer not null default 50,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_category_aliases_type_check check (
    alias_type in (
      'synonym', 'slang', 'typo', 'voice_search', 'product', 'problem',
      'profession', 'translation', 'regionalism', 'brand', 'emergency'
    )
  )
);

create unique index if not exists uq_business_category_aliases_scope
  on public.business_category_aliases (
    category_id,
    alias_normalized,
    coalesce(language, ''),
    coalesce(country, ''),
    coalesce(region, ''),
    alias_type
  );

create table if not exists public.business_search_intents (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.business_categories(id) on delete cascade,
  intent_phrase text not null,
  intent_normalized text not null,
  language text not null default 'es',
  country text,
  region text,
  weight integer not null default 60,
  intent_type text not null default 'need_state',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_business_search_intents_scope
  on public.business_search_intents (
    category_id,
    intent_normalized,
    coalesce(language, ''),
    coalesce(country, ''),
    coalesce(region, '')
  );

create table if not exists public.seo_landing_pages (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.business_categories(id) on delete cascade,
  country text,
  state text,
  city text,
  language text not null default 'es',
  slug text not null unique,
  title text,
  meta_description text,
  h1 text,
  intro_text text,
  canonical_url text,
  index_status text not null default 'draft',
  business_count integer not null default 0,
  quality_score numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_landing_pages_status_check check (index_status in ('draft', 'candidate', 'indexed', 'noindex', 'archived'))
);

create table if not exists public.business_category_mappings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.business_categories(id) on delete cascade,
  confidence_score numeric(5,2) not null default 0.50,
  is_primary boolean not null default false,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_category_mappings_source_check check (
    source in ('user_selected', 'denue_import', 'ai_classified', 'admin_reviewed', 'google_places', 'manual')
  )
);

create unique index if not exists uq_business_category_mappings_pair
  on public.business_category_mappings (business_id, category_id);

create unique index if not exists uq_business_category_mappings_primary
  on public.business_category_mappings (business_id)
  where is_primary = true;

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  normalized_query text not null,
  detected_language text,
  detected_country text,
  matched_category_id uuid references public.business_categories(id) on delete set null,
  matched_term text,
  match_source text,
  results_count integer not null default 0,
  user_location_city text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_categories_slug on public.business_categories(slug);
create index if not exists idx_business_categories_parent on public.business_categories(parent_id);
create index if not exists idx_business_category_aliases_alias_norm on public.business_category_aliases(alias_normalized);
create index if not exists idx_business_category_aliases_country on public.business_category_aliases(country);
create index if not exists idx_business_category_aliases_alias_trgm on public.business_category_aliases using gin (alias_normalized gin_trgm_ops);
create index if not exists idx_business_search_intents_norm on public.business_search_intents(intent_normalized);
create index if not exists idx_business_search_intents_country on public.business_search_intents(country);
create index if not exists idx_business_search_intents_trgm on public.business_search_intents using gin (intent_normalized gin_trgm_ops);
create index if not exists idx_business_category_mappings_business on public.business_category_mappings(business_id);
create index if not exists idx_business_category_mappings_category on public.business_category_mappings(category_id);
create index if not exists idx_search_logs_normalized on public.search_logs(normalized_query);
create index if not exists idx_search_logs_created_at on public.search_logs(created_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_business_categories_updated_at
before update on public.business_categories
for each row execute function public.set_updated_at_timestamp();

create or replace trigger trg_business_category_aliases_updated_at
before update on public.business_category_aliases
for each row execute function public.set_updated_at_timestamp();

create or replace trigger trg_business_search_intents_updated_at
before update on public.business_search_intents
for each row execute function public.set_updated_at_timestamp();

create or replace trigger trg_seo_landing_pages_updated_at
before update on public.seo_landing_pages
for each row execute function public.set_updated_at_timestamp();

create or replace trigger trg_business_category_mappings_updated_at
before update on public.business_category_mappings
for each row execute function public.set_updated_at_timestamp();

alter table public.business_categories enable row level security;
alter table public.business_category_aliases enable row level security;
alter table public.business_search_intents enable row level security;
alter table public.seo_landing_pages enable row level security;
alter table public.business_category_mappings enable row level security;
alter table public.search_logs enable row level security;

drop policy if exists "Public read active business categories" on public.business_categories;
create policy "Public read active business categories"
  on public.business_categories
  for select
  using (is_active = true);

drop policy if exists "Public read active category aliases" on public.business_category_aliases;
create policy "Public read active category aliases"
  on public.business_category_aliases
  for select
  using (is_active = true);

drop policy if exists "Public read active search intents" on public.business_search_intents;
create policy "Public read active search intents"
  on public.business_search_intents
  for select
  using (is_active = true);

drop policy if exists "Public read indexed seo landing pages" on public.seo_landing_pages;
create policy "Public read indexed seo landing pages"
  on public.seo_landing_pages
  for select
  using (index_status in ('candidate', 'indexed'));

drop policy if exists "Authenticated read business category mappings" on public.business_category_mappings;
create policy "Authenticated read business category mappings"
  on public.business_category_mappings
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated insert search logs" on public.search_logs;
create policy "Authenticated insert search logs"
  on public.search_logs
  for insert
  to authenticated
  with check (true);

create or replace function public.resolve_business_search_term(
  search_query text,
  user_country text default null,
  user_language text default 'es'
)
returns table (
  category_id uuid,
  category_slug text,
  category_name_es text,
  category_name_en text,
  matched_term text,
  match_source text,
  weight integer
)
language sql
stable
as $$
with normalized as (
  select public.gbk_normalize_text(search_query) as q
),
alias_matches as (
  select
    bc.id as category_id,
    bc.slug as category_slug,
    bc.name_es as category_name_es,
    bc.name_en as category_name_en,
    bca.alias as matched_term,
    'alias'::text as match_source,
    bca.weight as weight,
    row_number() over (
      partition by bc.id
      order by
        case when bca.alias_normalized = n.q then 0 else 1 end,
        similarity(bca.alias_normalized, n.q) desc,
        bca.weight desc
    ) as rn
  from normalized n
  join public.business_category_aliases bca
    on bca.is_active = true
   and (
        bca.alias_normalized = n.q
        or bca.alias_normalized like '%' || n.q || '%'
        or n.q like '%' || bca.alias_normalized || '%'
        or similarity(bca.alias_normalized, n.q) >= 0.45
   )
  join public.business_categories bc
    on bc.id = bca.category_id
   and bc.is_active = true
  where (bca.country is null or bca.country = user_country)
    and (bca.language is null or bca.language = user_language or bca.language like split_part(user_language, '-', 1) || '%')
),
intent_matches as (
  select
    bc.id as category_id,
    bc.slug as category_slug,
    bc.name_es as category_name_es,
    bc.name_en as category_name_en,
    bsi.intent_phrase as matched_term,
    'intent'::text as match_source,
    bsi.weight as weight,
    row_number() over (
      partition by bc.id
      order by
        case when bsi.intent_normalized = n.q then 0 else 1 end,
        similarity(bsi.intent_normalized, n.q) desc,
        bsi.weight desc
    ) as rn
  from normalized n
  join public.business_search_intents bsi
    on bsi.is_active = true
   and (
        bsi.intent_normalized = n.q
        or bsi.intent_normalized like '%' || n.q || '%'
        or n.q like '%' || bsi.intent_normalized || '%'
        or similarity(bsi.intent_normalized, n.q) >= 0.40
   )
  join public.business_categories bc
    on bc.id = bsi.category_id
   and bc.is_active = true
  where (bsi.country is null or bsi.country = user_country)
    and (bsi.language is null or bsi.language = user_language or bsi.language like split_part(user_language, '-', 1) || '%')
)
select category_id, category_slug, category_name_es, category_name_en, matched_term, match_source, weight
from (
  select category_id, category_slug, category_name_es, category_name_en, matched_term, match_source, weight
  from alias_matches where rn = 1
  union all
  select category_id, category_slug, category_name_es, category_name_en, matched_term, match_source, weight
  from intent_matches where rn = 1
) resolved
order by weight desc, category_name_es asc
limit 10;
$$;

create or replace function public.search_businesses_knowledge_graph(
  search_query text,
  user_country text default null,
  user_language text default 'es'
)
returns table (
  business_id uuid,
  name text,
  category text,
  match_score integer,
  matched_term text,
  match_source text,
  category_slug text
)
language sql
stable
as $$
with resolved as (
  select *
  from public.resolve_business_search_term(search_query, user_country, user_language)
),
mapped_businesses as (
  select
    b.id as business_id,
    b.name,
    coalesce(b.subcategory, b.category) as category,
    least(100, greatest(55, round(r.weight)))::integer as match_score,
    r.matched_term,
    r.match_source,
    r.category_slug,
    row_number() over (partition by b.id order by r.weight desc, bcm.confidence_score desc nulls last) as rn
  from resolved r
  join public.business_category_mappings bcm
    on bcm.category_id = r.category_id
  join public.businesses b
    on b.id = bcm.business_id
   and b.status = 'approved'
   and coalesce(b.is_visible, true) = true
),
direct_businesses as (
  select
    b.id as business_id,
    b.name,
    coalesce(b.subcategory, b.category) as category,
    52::integer as match_score,
    search_query as matched_term,
    'business_text'::text as match_source,
    null::text as category_slug,
    row_number() over (partition by b.id order by b.name asc) as rn
  from public.businesses b
  where b.status = 'approved'
    and coalesce(b.is_visible, true) = true
    and (
      public.gbk_normalize_text(b.name) like '%' || public.gbk_normalize_text(search_query) || '%'
      or public.gbk_normalize_text(coalesce(b.category, '')) like '%' || public.gbk_normalize_text(search_query) || '%'
      or public.gbk_normalize_text(coalesce(b.subcategory, '')) like '%' || public.gbk_normalize_text(search_query) || '%'
    )
)
select business_id, name, category, match_score, matched_term, match_source, category_slug
from (
  select business_id, name, category, match_score, matched_term, match_source, category_slug
  from mapped_businesses where rn = 1
  union all
  select business_id, name, category, match_score, matched_term, match_source, category_slug
  from direct_businesses where rn = 1
) ranked
order by match_score desc, name asc
limit 100;
$$;

grant execute on function public.resolve_business_search_term(text, text, text) to anon, authenticated;
grant execute on function public.search_businesses_knowledge_graph(text, text, text) to anon, authenticated;
