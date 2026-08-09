-- Overture Maps pilot seed for Zurich, Switzerland (ch-zurich)
-- Wave 5 candidate, status: candidate, target: 1000

BEGIN;

INSERT INTO public.international_businesses (
  source_dataset, source_record_id, name, normalized_name, primary_category,
  categories, country_code, city, state, postal_code, address_line,
  latitude, longitude, phone, website, confidence, is_visible, status, metadata
) VALUES
  ('overture_maps', 'ovt_ch_zrh_001', 'Kronenhalle', 'kronenhalle', 'restaurant', ARRAY['restaurant', 'swiss', 'fine_dining', 'food'], 'CH', 'Zurich', 'Zurich', '8001', 'Rämistrasse 4, 8001 Zürich', 47.3675, 8.5458, '+41 44 262 99 00', 'https://kronenhalle.ch', 0.98, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_ch_zrh_002', 'Confiserie Sprüngli Paradeplatz', 'confiserie sprungli paradeplatz', 'bakery', ARRAY['bakery', 'cafe', 'chocolate', 'food'], 'CH', 'Zurich', 'Zurich', '8001', 'Bahnhofstrasse 21, 8001 Zürich', 47.3698, 8.5391, '+41 44 224 46 46', 'https://spruengli.ch', 0.97, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_ch_zrh_003', 'Baur au Lac', 'baur au lac', 'hotel', ARRAY['hotel', 'luxury', 'accommodation'], 'CH', 'Zurich', 'Zurich', '8001', 'Talstrasse 1, 8001 Zürich', 47.3664, 8.5385, '+41 44 220 50 20', 'https://bauraulac.ch', 0.98, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_ch_zrh_004', 'Kunsthaus Zürich', 'kunsthaus zurich', 'arts_culture', ARRAY['museum', 'art', 'culture', 'tourist_attraction'], 'CH', 'Zurich', 'Zurich', '8001', 'Heimplatz 1, 8001 Zürich', 47.3702, 8.5488, '+41 44 253 84 84', 'https://kunsthaus.ch', 0.99, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb)
ON CONFLICT (source_record_id) DO NOTHING;

COMMIT;
