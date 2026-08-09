-- Overture Maps pilot seed for Tokyo, Japan (jp-tokyo)
-- Wave 5 candidate, status: candidate, target: 1000

BEGIN;

INSERT INTO public.international_businesses (
  source_dataset, source_record_id, name, normalized_name, primary_category,
  categories, country_code, city, state, postal_code, address_line,
  latitude, longitude, phone, website, confidence, is_visible, status, metadata
) VALUES
  ('overture_maps', 'ovt_jp_tyo_001', 'Sukiyabashi Jiro', 'sukiyabashi jiro', 'restaurant', ARRAY['restaurant', 'sushi', 'japanese', 'food'], 'JP', 'Tokyo', 'Tokyo', '104-0061', 'Tsukamoto Sogyo Bldg. B1F, 4-2-15 Ginza, Chuo', 35.6718, 139.7641, '+81 3-3535-3600', 'https://sushijiro.gr.jp', 0.98, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_jp_tyo_002', 'Tsutaya Books Daikanyama', 'tsutaya books daikanyama', 'bookstore', ARRAY['books', 'cafe', 'shopping', 'culture'], 'JP', 'Tokyo', 'Tokyo', '150-0033', '17-5 Sarugakucho, Shibuya', 35.6492, 139.6998, '+81 3-3770-2525', 'https://store.tsite.jp/daikanyama', 0.97, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_jp_tyo_003', 'Park Hyatt Tokyo', 'park hyatt tokyo', 'hotel', ARRAY['hotel', 'luxury', 'accommodation'], 'JP', 'Tokyo', 'Tokyo', '163-1055', '3-7-1-2 Nishi-Shinjuku, Shinjuku', 35.6856, 139.6911, '+81 3-5322-1234', 'https://hyatt.com', 0.96, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_jp_tyo_004', 'Mori Art Museum', 'mori art museum', 'arts_culture', ARRAY['museum', 'art', 'culture', 'tourist_attraction'], 'JP', 'Tokyo', 'Tokyo', '106-6150', '6-10-1 Roppongi, Minato', 35.6605, 139.7292, '+81 50-5541-8600', 'https://mori.art.museum', 0.98, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_jp_tyo_005', 'Fuglen Tokyo', 'fuglen tokyo', 'cafeteria', ARRAY['cafe', 'coffee', 'bar'], 'JP', 'Tokyo', 'Tokyo', '151-0063', '1-16-11 Tomigaya, Shibuya', 35.6672, 139.6919, '+81 3-6804-9241', 'https://fuglen.no', 0.94, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb)
ON CONFLICT (source_record_id) DO NOTHING;

COMMIT;
