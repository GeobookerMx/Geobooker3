-- Overture Maps pilot seed for Sydney, Australia (au-sydney)
-- Wave 5 candidate, status: candidate, target: 1000

BEGIN;

INSERT INTO public.international_businesses (
  source_dataset, source_record_id, name, normalized_name, primary_category,
  categories, country_code, city, state, postal_code, address_line,
  latitude, longitude, phone, website, confidence, is_visible, status, metadata
) VALUES
  ('overture_maps', 'ovt_au_syd_001', 'Quay Restaurant', 'quay restaurant', 'restaurant', ARRAY['restaurant', 'fine_dining', 'australian', 'food'], 'AU', 'Sydney', 'NSW', '2000', 'Upper Level Overseas Passenger Terminal, The Rocks', -33.8587, 151.2101, '+61 2 9251 5600', 'https://quay.com.au', 0.97, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_au_syd_002', 'Single O Surry Hills', 'single o surry hills', 'cafeteria', ARRAY['cafe', 'coffee', 'bakery'], 'AU', 'Sydney', 'NSW', '2010', '60-64 Reservoir St, Surry Hills', -33.8812, 151.2098, '+61 2 9211 0665', 'https://singleo.com.au', 0.95, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_au_syd_003', 'Art Gallery of New South Wales', 'art gallery of new south wales', 'arts_culture', ARRAY['museum', 'art', 'culture', 'tourist_attraction'], 'AU', 'Sydney', 'NSW', '2000', 'Art Gallery Rd, The Domain', -33.8688, 151.2173, '+61 2 9225 1700', 'https://artgallery.nsw.gov.au', 0.98, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_au_syd_004', 'The Langham Sydney', 'the langham sydney', 'hotel', ARRAY['hotel', 'luxury', 'accommodation'], 'AU', 'Sydney', 'NSW', '2000', '89-113 Kent St, Millers Point', -33.8601, 151.2039, '+61 2 9256 2222', 'https://langhamhotels.com', 0.96, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb)
ON CONFLICT (source_record_id) DO NOTHING;

COMMIT;
