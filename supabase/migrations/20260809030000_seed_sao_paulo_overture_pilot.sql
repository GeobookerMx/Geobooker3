-- Overture Maps pilot seed for São Paulo, Brazil (br-sao-paulo)
-- Wave 4 candidate, status: candidate, target: 1000

BEGIN;

INSERT INTO public.international_businesses (
  source_dataset, source_record_id, name, normalized_name, primary_category,
  categories, country_code, city, state, postal_code, address_line,
  latitude, longitude, phone, website, confidence, is_visible, status, metadata
) VALUES
  ('overture_maps', 'ovt_br_sp_001', 'D.O.M. Restaurante', 'dom restaurante', 'restaurant', ARRAY['restaurant', 'gastronomy', 'food'], 'BR', 'São Paulo', 'SP', '01419-001', 'R. Barão de Capanema, 549 - Cerqueira César', -23.5658, -46.6662, '+55 11 3088-0740', 'https://domrestaurante.com.br', 0.95, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_br_sp_002', 'Maní Restaurante', 'mani restaurante', 'restaurant', ARRAY['restaurant', 'brazilian', 'food'], 'BR', 'São Paulo', 'SP', '01445-001', 'R. Joaquim Antunes, 210 - Jardim Paulistano', -23.5612, -46.6801, '+55 11 3085-4161', 'https://manimanioca.com.br', 0.94, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_br_sp_003', 'Masp - Museu de Arte de São Paulo', 'masp museu de arte de sao paulo', 'arts_culture', ARRAY['museum', 'art', 'culture', 'tourist_attraction'], 'BR', 'São Paulo', 'SP', '01310-200', 'Av. Paulista, 1578 - Bela Vista', -23.5614, -46.6559, '+55 11 3149-5959', 'https://masp.org.br', 0.98, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_br_sp_004', 'Hotel Fasano São Paulo', 'hotel fasano sao paulo', 'hotel', ARRAY['hotel', 'accommodation', 'luxury'], 'BR', 'São Paulo', 'SP', '01419-001', 'R. Vitório Fasano, 88 - Cerqueira César', -23.5664, -46.6675, '+55 11 3896-4000', 'https://fasano.com.br', 0.96, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_br_sp_005', 'Mercado Municipal de São Paulo', 'mercado municipal de sao paulo', 'shopping', ARRAY['market', 'food', 'tourist_attraction'], 'BR', 'São Paulo', 'SP', '01029-000', 'R. Cantareira, 306 - Centro Histórico', -23.5418, -46.6296, '+55 11 4934-1304', 'https://mercadomunicipalsp.com.br', 0.97, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_br_sp_006', 'Hospital Sírio-Libanês', 'hospital sirio libanes', 'healthcare', ARRAY['hospital', 'health', 'medical'], 'BR', 'São Paulo', 'SP', '01308-001', 'R. Dona Adma Jafet, 115 - Bela Vista', -23.5571, -46.6528, '+55 11 3394-0200', 'https://hospitalsiriolibanes.org.br', 0.96, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_br_sp_007', 'Livaria da Vila - Fradique', 'livraria da vila fradique', 'bookstore', ARRAY['books', 'shopping', 'culture'], 'BR', 'São Paulo', 'SP', '05416-001', 'R. Fradique Coutinho, 915 - Pinheiros', -23.5598, -46.6912, '+55 11 3814-5811', 'https://livrariadavila.com.br', 0.92, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_br_sp_008', 'Coffee Lab Pinheiros', 'coffee lab pinheiros', 'cafeteria', ARRAY['cafe', 'coffee', 'bakery'], 'BR', 'São Paulo', 'SP', '05435-000', 'R. Fradique Coutinho, 1340 - Vila Madalena', -23.5581, -46.6953, '+55 11 3375-7400', 'https://coffeelab.com.br', 0.93, TRUE, 'approved', '{"wave": 4, "pilot": true}'::jsonb)
ON CONFLICT (source_record_id) DO NOTHING;

COMMIT;
