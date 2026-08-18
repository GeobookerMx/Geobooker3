-- Compatibility bridge for wave 4 international seed files.
-- Earlier Overture seeds created the table with the Geobooker directory shape.
-- Wave 4 seeds add source_dataset/primary_category metadata and omit slug.

BEGIN;

ALTER TABLE public.international_businesses
  ADD COLUMN IF NOT EXISTS source_dataset TEXT,
  ADD COLUMN IF NOT EXISTS normalized_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_category TEXT,
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.international_businesses
  ALTER COLUMN slug SET DEFAULT ('international-' || replace(gen_random_uuid()::text, '-', '')),
  ALTER COLUMN attribution_text SET DEFAULT 'Overture Maps Foundation, Places 2026-06-17.0';

UPDATE public.international_businesses
SET
  source_dataset = COALESCE(source_dataset, source_type),
  normalized_name = COALESCE(normalized_name, LOWER(name)),
  primary_category = COALESCE(primary_category, subcategory, category),
  categories = COALESCE(categories, ARRAY_REMOVE(ARRAY[category, subcategory], NULL)),
  state = COALESCE(state, state_code),
  address_line = COALESCE(address_line, address)
WHERE source_dataset IS NULL
   OR normalized_name IS NULL
   OR primary_category IS NULL
   OR state IS NULL
   OR address_line IS NULL;

CREATE INDEX IF NOT EXISTS idx_international_businesses_source_dataset
  ON public.international_businesses(source_dataset);

CREATE INDEX IF NOT EXISTS idx_international_businesses_primary_category
  ON public.international_businesses(primary_category);

COMMIT;
