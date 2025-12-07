-- ==========================================================
-- EXTENSIÓN: TODOS LOS ESTADOS DE MÉXICO
-- ==========================================================
-- Ejecuta este script para agregar los 32 estados completos de México

INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  -- Ya existentes (los dejamos para referencia)
  ('MX', 'CMX', 'Ciudad de México', 'Mexico City'),
  ('MX', 'JAL', 'Jalisco', 'Jalisco'),
  ('MX', 'NL', 'Nuevo León', 'Nuevo Leon'),
  ('MX', 'QRO', 'Querétaro', 'Queretaro'),
  ('MX', 'GTO', 'Guanajuato', 'Guanajuato'),
  ('MX', 'PUE', 'Puebla', 'Puebla'),
  ('MX', 'YUC', 'Yucatán', 'Yucatan'),
  ('MX', 'QR', 'Quintana Roo', 'Quintana Roo'),
  ('MX', 'BCN', 'Baja California', 'Baja California'),
  ('MX', 'CHI', 'Chihuahua', 'Chihuahua'),
  
  -- Estados adicionales (completar los 32)
  ('MX', 'AGS', 'Aguascalientes', 'Aguascalientes'),
  ('MX', 'BCS', 'Baja California Sur', 'Baja California Sur'),
  ('MX', 'CAM', 'Campeche', 'Campeche'),
  ('MX', 'CHP', 'Chiapas', 'Chiapas'),
  ('MX', 'COA', 'Coahuila', 'Coahuila'),
  ('MX', 'COL', 'Colima', 'Colima'),
  ('MX', 'DUR', 'Durango', 'Durango'),
  ('MX', 'MEX', 'Estado de México', 'State of Mexico'),
  ('MX', 'GRO', 'Guerrero', 'Guerrero'),
  ('MX', 'HGO', 'Hidalgo', 'Hidalgo'),
  ('MX', 'MIC', 'Michoacán', 'Michoacan'),
  ('MX', 'MOR', 'Morelos', 'Morelos'),
  ('MX', 'NAY', 'Nayarit', 'Nayarit'),
  ('MX', 'OAX', 'Oaxaca', 'Oaxaca'),
  ('MX', 'SIN', 'Sinaloa', 'Sinaloa'),
  ('MX', 'SLP', 'San Luis Potosí', 'San Luis Potosi'),
  ('MX', 'SON', 'Sonora', 'Sonora'),
  ('MX', 'TAB', 'Tabasco', 'Tabasco'),
  ('MX', 'TAM', 'Tamaulipas', 'Tamaulipas'),
  ('MX', 'TLX', 'Tlaxcala', 'Tlaxcala'),
  ('MX', 'VER', 'Veracruz', 'Veracruz'),
  ('MX', 'ZAC', 'Zacatecas', 'Zacatecas')
ON CONFLICT (country_code, code) DO NOTHING;

-- Verificar
SELECT 
  'México' as pais,
  COUNT(*) as total_estados
FROM geographic_regions 
WHERE country_code = 'MX';
