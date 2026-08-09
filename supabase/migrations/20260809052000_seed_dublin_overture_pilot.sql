-- Overture Maps pilot seed for Dublin, Ireland (ie-dublin)
-- Wave 5 candidate, status: candidate, target: 1000

BEGIN;

INSERT INTO public.international_businesses (
  source_dataset, source_record_id, name, normalized_name, primary_category,
  categories, country_code, city, state, postal_code, address_line,
  latitude, longitude, phone, website, confidence, is_visible, status, metadata
) VALUES
  ('overture_maps', 'ovt_ie_dub_001', 'Chapter One Restaurant', 'chapter one restaurant', 'restaurant', ARRAY['restaurant', 'irish', 'fine_dining', 'food'], 'IE', 'Dublin', 'County Dublin', 'D01 T620', '18-19 Parnell Square N, Rotunda', 53.3541, -6.2642, '+353 1 873 2266', 'https://chapteronerestaurant.com', 0.97, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_ie_dub_002', '3FE Coffee', '3fe coffee', 'cafeteria', ARRAY['cafe', 'coffee', 'bakery'], 'IE', 'Dublin', 'County Dublin', 'D02 E938', '32 Grand Canal Street Lower', 53.3385, -6.2392, '+353 1 667 8000', 'https://3fe.com', 0.95, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_ie_dub_003', 'Hodges Figgis Bookstore', 'hodges figgis bookstore', 'bookstore', ARRAY['books', 'shopping', 'culture'], 'IE', 'Dublin', 'County Dublin', 'D02 Y589', '56-58 Dawson St, Dublin 2', 53.3421, -6.2587, '+353 1 677 4754', 'https://waterstones.com', 0.96, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_ie_dub_004', 'The Shelbourne Hotel', 'the shelbourne hotel', 'hotel', ARRAY['hotel', 'luxury', 'heritage', 'accommodation'], 'IE', 'Dublin', 'County Dublin', 'D02 K288', '27 St Stephen''s Green', 53.3392, -6.2559, '+353 1 663 4500', 'https://theshelbourne.com', 0.98, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb)
ON CONFLICT (source_record_id) DO NOTHING;

COMMIT;
