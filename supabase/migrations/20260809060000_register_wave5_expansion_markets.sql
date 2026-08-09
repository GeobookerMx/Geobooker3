-- Register Wave 5 expansion cities in international_markets.
-- Tokyo (JP), Sydney (AU), Dublin (IE), Zurich (CH), Medellín (CO)

BEGIN;

INSERT INTO public.international_markets (
  id, country_code, country_name, city_name, default_language, timezone,
  wave, status, rollout_stage, target_records, source_release, extraction_enabled
) VALUES
  ('jp-tokyo',    'JP', 'Japan',       'Tokyo',    'ja', 'Asia/Tokyo',       5, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('au-sydney',   'AU', 'Australia',   'Sydney',   'en', 'Australia/Sydney', 5, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('ie-dublin',   'IE', 'Ireland',     'Dublin',   'en', 'Europe/Dublin',    5, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('ch-zurich',   'CH', 'Switzerland', 'Zurich',   'de', 'Europe/Zurich',    5, 'candidate', 0, 1000, '2026-06-17.0', FALSE),
  ('co-medellin', 'CO', 'Colombia',    'Medellín', 'es', 'America/Bogota',   5, 'candidate', 0, 1000, '2026-06-17.0', FALSE)
ON CONFLICT (id) DO UPDATE SET
  country_code     = EXCLUDED.country_code,
  country_name     = EXCLUDED.country_name,
  city_name        = EXCLUDED.city_name,
  default_language  = EXCLUDED.default_language,
  timezone         = EXCLUDED.timezone,
  wave             = EXCLUDED.wave,
  target_records   = EXCLUDED.target_records,
  updated_at       = NOW();

-- Sync imported / visible counts from the seed data.
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
  WHERE country_code IN ('JP', 'AU', 'IE', 'CH', 'CO')
  GROUP BY country_code, city
) AS counts
WHERE market.country_code = counts.country_code
  AND LOWER(market.city_name) = LOWER(counts.city);

COMMIT;
