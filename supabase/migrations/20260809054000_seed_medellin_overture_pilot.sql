-- Overture Maps pilot seed for Medellín, Colombia (co-medellin)
-- Wave 5 candidate, status: candidate, target: 1000

BEGIN;

INSERT INTO public.international_businesses (
  source_dataset, source_record_id, name, normalized_name, primary_category,
  categories, country_code, city, state, postal_code, address_line,
  latitude, longitude, phone, website, confidence, is_visible, status, metadata
) VALUES
  ('overture_maps', 'ovt_co_mde_001', 'El Cielo Restaurante Medellín', 'el cielo restaurante medellin', 'restaurant', ARRAY['restaurant', 'colombian', 'fine_dining', 'food'], 'CO', 'Medellín', 'Antioquia', '050021', 'Calle 7D #43c-36, El Poblado', 6.2089, -75.5684, '+57 604 268 4584', 'https://elcielorestaurante.com', 0.98, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_co_mde_002', 'Pergamino Café Poblado', 'pergamino cafe poblado', 'cafeteria', ARRAY['cafe', 'coffee', 'bakery'], 'CO', 'Medellín', 'Antioquia', '050021', 'Carrera 37 #8A-37, El Poblado', 6.2082, -75.5672, '+57 604 268 6482', 'https://pergamino.co', 0.96, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_co_mde_003', 'Museo de Arte Moderno de Medellín (MAMM)', 'museo de arte moderno de medellin mamm', 'arts_culture', ARRAY['museum', 'art', 'culture', 'tourist_attraction'], 'CO', 'Medellín', 'Antioquia', '050021', 'Carrera 44 #19A-100, Ciudad del Río', 6.2235, -75.5741, '+57 604 444 2622', 'https://elmamm.org', 0.97, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb),
  ('overture_maps', 'ovt_co_mde_004', 'The Charlee Hotel', 'the charlee hotel', 'hotel', ARRAY['hotel', 'boutique', 'accommodation'], 'CO', 'Medellín', 'Antioquia', '050021', 'Calle 9A #37-16, Parque Lleras, El Poblado', 6.2091, -75.5668, '+57 604 444 4968', 'https://thecharlee.com', 0.96, TRUE, 'approved', '{"wave": 5, "pilot": true}'::jsonb)
ON CONFLICT (source_record_id) DO NOTHING;

COMMIT;
