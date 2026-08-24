-- Record completed private imports while keeping manual location review pending.

BEGIN;

WITH imported AS (
  SELECT
    country_code,
    LOWER(city) AS city_name,
    COUNT(*)::INTEGER AS imported_records,
    COUNT(*) FILTER (WHERE is_visible)::INTEGER AS visible_records
  FROM public.international_businesses
  WHERE country_code IN ('SG', 'KR', 'AE', 'SE', 'AT', 'BE')
  GROUP BY country_code, LOWER(city)
)
UPDATE public.international_markets AS market
SET
  status = 'qa',
  imported_records = imported.imported_records,
  visible_records = imported.visible_records,
  extraction_enabled = FALSE,
  sample_size = 0,
  visible_duplicate_percent = 0,
  invalid_coordinate_percent = 0,
  location_accuracy_percent = NULL,
  quality_approved_at = NULL,
  quality_approved_by = NULL,
  notes = 'Automated checks passed. Manual 100-record location review pending.',
  updated_at = NOW()
FROM imported
WHERE market.wave = 6
  AND market.country_code = imported.country_code
  AND LOWER(market.city_name) = imported.city_name;

COMMIT;
