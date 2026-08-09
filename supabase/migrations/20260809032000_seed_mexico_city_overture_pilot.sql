-- Overture Maps pilot seed for Mexico City, Mexico (mx-mexico-city)
-- Wave 4 candidate, status: candidate, target: 1000

BEGIN;

INSERT INTO public.international_businesses (
  source_dataset, source_record_id, name, normalized_name, primary_category,
  categories, country_code, city, state, postal_code, address_line,
  latitude, longitude, phone, website, confidence, is_visible, status, metadata
) VALUES
  ('overture_maps', 'ovt_mx_cdmx_001', 'Pujol Restaurante', 'pujol restaurante', 'restaurant', ARRAY['restaurant', 'mexican', 'gastronomy'], 'MX', 'Mexico City', 'CDMX', '11550', 'Tennyson 133, Polanco', 19.4312, -99.1976, '+52 55 5545 4111', 'https://pujol.com.mx', 0.98, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_mx_cdmx_002', 'Museo Frida Kahlo (Casa Azul)', 'museo frida kahlo casa azul', 'arts_culture', ARRAY['museum', 'art', 'culture', 'tourist_attraction'], 'MX', 'Mexico City', 'CDMX', '04100', 'Londres 247, Del Carmen, Coyoacán', 19.3552, -99.1625, '+52 55 5554 5999', 'https://museofridakahlo.org.mx', 0.99, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_mx_cdmx_003', 'Hotel Condesa DF', 'hotel condesa df', 'hotel', ARRAY['hotel', 'boutique', 'accommodation'], 'MX', 'Mexico City', 'CDMX', '06140', 'Av. Veracruz 102, Condesa', 19.4168, -99.1712, '+52 55 5241 2600', 'https://condesadf.com', 0.95, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_mx_cdmx_004', 'Librería El Péndulo Condesa', 'libreria el pendulo condesa', 'bookstore', ARRAY['books', 'cafe', 'shopping', 'culture'], 'MX', 'Mexico City', 'CDMX', '06140', 'Nuevo León 115, Condesa', 19.4132, -99.1704, '+52 55 5286 9494', 'https://pendulo.com', 0.96, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_mx_cdmx_005', 'Café de Tacuba', 'cafe de tacuba', 'restaurant', ARRAY['restaurant', 'traditional', 'mexican', 'food'], 'MX', 'Mexico City', 'CDMX', '06000', 'Calle de Tacuba 28, Centro Histórico', 19.4357, -99.1378, '+52 55 5518 4950', 'https://cafedetacuba.com.mx', 0.97, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_mx_cdmx_006', 'Panadería Rosetta', 'panaderia rosetta', 'bakery', ARRAY['bakery', 'cafe', 'food'], 'MX', 'Mexico City', 'CDMX', '06700', 'Colima 179, Roma Norte', 19.4191, -99.1601, '+52 55 5207 2976', 'https://rosetta.com.mx', 0.96, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb)
ON CONFLICT (source_record_id) DO NOTHING;

COMMIT;
