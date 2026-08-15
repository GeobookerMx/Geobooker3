-- Register Wave 6 expansion cities in international_markets.
-- Singapore (SG), Seoul (KR), Dubai (AE), Stockholm (SE), Vienna (AT), Brussels (BE)

BEGIN;

INSERT INTO public.international_markets (
  id, country_code, country_name, city_name, default_language, timezone,
  wave, status, rollout_stage, target_records, source_release, extraction_enabled
) VALUES
  ('sg-singapore', 'SG', 'Singapore',    'Singapore', 'en', 'Asia/Singapore',   6, 'candidate', 0, 1000, '2026-08-15.0', FALSE),
  ('kr-seoul',     'KR', 'South Korea',  'Seoul',     'ko', 'Asia/Seoul',        6, 'candidate', 0, 1000, '2026-08-15.0', FALSE),
  ('ae-dubai',     'AE', 'UAE',          'Dubai',     'en', 'Asia/Dubai',        6, 'candidate', 0, 1000, '2026-08-15.0', FALSE),
  ('se-stockholm', 'SE', 'Sweden',       'Stockholm', 'sv', 'Europe/Stockholm',  6, 'candidate', 0, 1000, '2026-08-15.0', FALSE),
  ('at-vienna',    'AT', 'Austria',      'Vienna',    'de', 'Europe/Vienna',     6, 'candidate', 0, 1000, '2026-08-15.0', FALSE),
  ('be-brussels',  'BE', 'Belgium',      'Brussels',  'fr', 'Europe/Brussels',   6, 'candidate', 0, 1000, '2026-08-15.0', FALSE)
ON CONFLICT (id) DO UPDATE SET
  country_code      = EXCLUDED.country_code,
  country_name      = EXCLUDED.country_name,
  city_name         = EXCLUDED.city_name,
  default_language  = EXCLUDED.default_language,
  timezone          = EXCLUDED.timezone,
  wave              = EXCLUDED.wave,
  target_records    = EXCLUDED.target_records,
  updated_at        = NOW();

COMMIT;
