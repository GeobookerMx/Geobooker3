-- Overture Maps pilot seed for New York, United States (us-new-york)
-- Wave 4 candidate, status: candidate, target: 1000

BEGIN;

INSERT INTO public.international_businesses (
  source_dataset, source_record_id, name, normalized_name, primary_category,
  categories, country_code, city, state, postal_code, address_line,
  latitude, longitude, phone, website, confidence, is_visible, status, metadata
) VALUES
  ('overture_maps', 'ovt_us_nyc_001', 'Katz''s Delicatessen', 'katzs delicatessen', 'restaurant', ARRAY['restaurant', 'deli', 'food', 'new_york'], 'US', 'New York', 'NY', '10002', '205 E Houston St, Lower East Side', 40.7222, -73.9874, '+1 212-254-2246', 'https://katzsdelicatessen.com', 0.98, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_us_nyc_002', 'The Museum of Modern Art (MoMA)', 'the museum of modern art moma', 'arts_culture', ARRAY['museum', 'art', 'culture', 'tourist_attraction'], 'US', 'New York', 'NY', '10019', '11 W 53rd St, Midtown', 40.7614, -73.9776, '+1 212-708-9400', 'https://moma.org', 0.99, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_us_nyc_003', 'Joe''s Pizza Greenwich Village', 'joes pizza greenwich village', 'restaurant', ARRAY['pizza', 'restaurant', 'food'], 'US', 'New York', 'NY', '10014', '7 Carmine St, Greenwich Village', 40.7305, -74.0021, '+1 212-366-1182', 'https://joespizzanyc.com', 0.96, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_us_nyc_004', 'Strand Book Store', 'strand book store', 'bookstore', ARRAY['books', 'shopping', 'culture'], 'US', 'New York', 'NY', '10003', '828 Broadway, East Village', 40.7331, -73.9908, '+1 212-473-1452', 'https://strandbooks.com', 0.97, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_us_nyc_005', 'The Plaza Hotel', 'the plaza hotel', 'hotel', ARRAY['hotel', 'luxury', 'accommodation'], 'US', 'New York', 'NY', '10019', '768 5th Ave, Midtown', 40.7645, -73.9745, '+1 212-759-3000', 'https://theplazany.com', 0.97, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_us_nyc_006', 'Stumptown Coffee Roasters', 'stumptown coffee roasters', 'cafeteria', ARRAY['cafe', 'coffee', 'bakery'], 'US', 'New York', 'NY', '10001', '18 W 29th St, NoMad', 40.7456, -73.9882, '+1 844-489-0205', 'https://stumptowncoffee.com', 0.94, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb)
ON CONFLICT (source_record_id) DO NOTHING;

COMMIT;
