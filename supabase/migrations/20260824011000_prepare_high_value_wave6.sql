-- Prepare the high-value Wave 6 markets. This does not publish businesses.

BEGIN;

INSERT INTO public.international_markets (
  id, country_code, country_name, city_name, default_language, timezone,
  wave, status, rollout_stage, target_records, source_release, extraction_enabled
) VALUES
  ('sg-singapore', 'SG', 'Singapore',            'Singapore', 'en', 'Asia/Singapore',   6, 'planned', 0, 1000, '2026-08-19.0', TRUE),
  ('kr-seoul',     'KR', 'South Korea',          'Seoul',     'ko', 'Asia/Seoul',        6, 'planned', 0, 1000, '2026-08-19.0', TRUE),
  ('ae-dubai',     'AE', 'United Arab Emirates', 'Dubai',     'en', 'Asia/Dubai',        6, 'planned', 0, 1000, '2026-08-19.0', TRUE),
  ('se-stockholm', 'SE', 'Sweden',               'Stockholm', 'sv', 'Europe/Stockholm',  6, 'planned', 0, 1000, '2026-08-19.0', TRUE),
  ('at-vienna',    'AT', 'Austria',              'Vienna',    'de', 'Europe/Vienna',     6, 'planned', 0, 1000, '2026-08-19.0', TRUE),
  ('be-brussels',  'BE', 'Belgium',              'Brussels',  'fr', 'Europe/Brussels',   6, 'planned', 0, 1000, '2026-08-19.0', TRUE)
ON CONFLICT (id) DO UPDATE SET
  country_code       = EXCLUDED.country_code,
  country_name       = EXCLUDED.country_name,
  city_name          = EXCLUDED.city_name,
  default_language   = EXCLUDED.default_language,
  timezone           = EXCLUDED.timezone,
  wave               = EXCLUDED.wave,
  status             = CASE
    WHEN international_markets.status IN ('active', 'qa', 'preview') THEN international_markets.status
    ELSE 'planned'
  END,
  target_records     = EXCLUDED.target_records,
  source_release     = EXCLUDED.source_release,
  extraction_enabled = TRUE,
  updated_at         = NOW();

COMMIT;
