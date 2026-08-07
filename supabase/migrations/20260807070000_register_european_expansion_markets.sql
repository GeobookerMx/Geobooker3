-- Register European expansion cities in international_markets.
-- Amsterdam, Rome, Milan, Paris, Berlin, Lisbon — Wave 3, candidate status.
-- These cities use Overture Maps open data as their seed source.

BEGIN;

INSERT INTO public.international_markets (
  id, country_code, country_name, city_name, default_language, timezone,
  wave, status, rollout_stage, target_records, source_release, extraction_enabled
) VALUES
  ('nl-amsterdam', 'NL', 'Netherlands',  'Amsterdam', 'nl', 'Europe/Amsterdam',  3, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('it-rome',      'IT', 'Italy',         'Rome',      'it', 'Europe/Rome',        3, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('it-milan',     'IT', 'Italy',         'Milan',     'it', 'Europe/Rome',        3, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('fr-paris',     'FR', 'France',        'Paris',     'fr', 'Europe/Paris',       3, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('de-berlin',    'DE', 'Germany',       'Berlin',    'de', 'Europe/Berlin',      3, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('pt-lisbon',    'PT', 'Portugal',      'Lisbon',    'pt', 'Europe/Lisbon',      3, 'candidate', 0, 1000, '2026-06-17.0', FALSE)
ON CONFLICT (id) DO UPDATE SET
  country_code    = EXCLUDED.country_code,
  country_name    = EXCLUDED.country_name,
  city_name       = EXCLUDED.city_name,
  default_language = EXCLUDED.default_language,
  timezone        = EXCLUDED.timezone,
  wave            = EXCLUDED.wave,
  target_records  = EXCLUDED.target_records,
  updated_at      = NOW();

-- Sync imported / visible counts from the seed data just loaded.
-- Runs only for the new European cities; existing markets are not affected.
UPDATE public.international_markets AS market
SET
  imported_records = counts.imported_records,
  visible_records  = counts.visible_records,
  updated_at       = NOW()
FROM (
  SELECT
    country_code,
    city,
    COUNT(*)::INTEGER               AS imported_records,
    COUNT(*) FILTER (WHERE is_visible)::INTEGER AS visible_records
  FROM public.international_businesses
  WHERE country_code IN ('NL', 'IT', 'FR', 'DE', 'PT')
  GROUP BY country_code, city
) AS counts
WHERE market.country_code = counts.country_code
  AND LOWER(market.city_name) = LOWER(counts.city);

COMMIT;
