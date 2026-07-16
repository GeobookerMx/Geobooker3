-- ==============================================================================
-- GEOBOOKER ENTERPRISE + GLOBAL ADS
-- Opcion B 2026: precios base mas accesibles + 50% OFF durante todo 2026
-- Aplica pricing enterprise y tarifas base del inventario publicitario.
-- Fecha de referencia: 2026-07-16
-- ============================================================================== 

ALTER TABLE public.enterprise_pricing
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countries_included INTEGER DEFAULT 1;

INSERT INTO public.enterprise_pricing (
  code,
  name,
  description,
  regular_price_usd,
  regular_price_mxn,
  regular_price_eur,
  promo_price_usd,
  promo_price_mxn,
  promo_price_eur,
  discount_percent,
  cities_included,
  countries_included,
  duration_months,
  features,
  promo_active,
  promo_ends_at,
  is_active
)
VALUES
  ('city_launch','City Launch','1 ciudad activa por 1 mes - ideal para validar mercado',400,7200,368,200,3600,184,50,1,1,1,'["1 ciudad activa", "Busqueda patrocinada", "1 placement destacado en ciudad o categoria", "Pin patrocinado en mapa", "Dashboard basico"]'::jsonb,true,'2026-12-31 23:59:59+00',true),
  ('regional','Regional Pack','Hasta 5 ciudades activas en 2 paises, 3 meses de campana',900,16200,828,450,8100,414,50,5,2,3,'["Hasta 5 ciudades activas", "Rotacion de inventario patrocinado", "Dashboard por ciudad", "2 optimizaciones incluidas", "Soporte prioritario"]'::jsonb,true,'2026-12-31 23:59:59+00',true),
  ('country','Country Select','1 pais, hasta 12 ciudades activas, 3 meses de campana',1200,21600,1104,600,10800,552,50,12,1,3,'["Hasta 12 ciudades dentro de un pais", "Placements premium en territorios seleccionados", "Dashboard por ciudad/dispositivo/horario", "Revision mensual de desempeno", "Soporte prioritario"]'::jsonb,true,'2026-12-31 23:59:59+00',true),
  ('crossborder','Cross-Border Event','2-3 paises o region especifica, campanas de 2-3 meses',1500,27000,1380,750,13500,690,50,30,3,3,'["2-3 paises o region continental", "Segmentacion por idioma", "Flight por evento o temporada", "Reporte ejecutivo final", "Soporte consultivo dedicado"]'::jsonb,true,'2026-12-31 23:59:59+00',true),
  ('global_custom','Global Custom','Cobertura multi-pais o continental, bajo propuesta personalizada',2000,36000,1840,1000,18000,920,50,999,999,3,'["Multi-pais o continental", "Setup de campana a medida", "Inventario premium asignado", "Reporting ejecutivo personalizado", "Propuesta comercial y fiscal a medida"]'::jsonb,true,'2026-12-31 23:59:59+00',true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  regular_price_usd = EXCLUDED.regular_price_usd,
  regular_price_mxn = EXCLUDED.regular_price_mxn,
  regular_price_eur = EXCLUDED.regular_price_eur,
  promo_price_usd = EXCLUDED.promo_price_usd,
  promo_price_mxn = EXCLUDED.promo_price_mxn,
  promo_price_eur = EXCLUDED.promo_price_eur,
  discount_percent = EXCLUDED.discount_percent,
  cities_included = EXCLUDED.cities_included,
  countries_included = EXCLUDED.countries_included,
  duration_months = EXCLUDED.duration_months,
  features = EXCLUDED.features,
  promo_active = EXCLUDED.promo_active,
  promo_ends_at = EXCLUDED.promo_ends_at,
  is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.get_enterprise_pricing()
RETURNS TABLE (
  code TEXT,
  name TEXT,
  description TEXT,
  regular_price_usd DECIMAL,
  current_price_usd DECIMAL,
  regular_price_mxn DECIMAL,
  current_price_mxn DECIMAL,
  discount_percent INTEGER,
  is_promo_active BOOLEAN,
  promo_ends_at TIMESTAMP,
  cities_included INTEGER,
  countries_included INTEGER,
  duration_months INTEGER,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ep.code,
    ep.name,
    ep.description,
    ep.regular_price_usd,
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() THEN ep.promo_price_usd ELSE ep.regular_price_usd END AS current_price_usd,
    ep.regular_price_mxn,
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() THEN ep.promo_price_mxn ELSE ep.regular_price_mxn END AS current_price_mxn,
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() THEN COALESCE(ep.discount_percent, 0) ELSE 0 END AS discount_percent,
    ep.promo_active AND ep.promo_ends_at > NOW() AS is_promo_active,
    ep.promo_ends_at,
    ep.cities_included,
    COALESCE(ep.countries_included, 1) AS countries_included,
    ep.duration_months,
    ep.features
  FROM public.enterprise_pricing ep
  WHERE ep.is_active = true
  ORDER BY ep.regular_price_usd ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_enterprise_pricing() TO anon;
GRANT EXECUTE ON FUNCTION public.get_enterprise_pricing() TO authenticated;

UPDATE public.ad_inventory_slots
SET price_usd_per_month = 2000
WHERE level = 'global';

WITH inventory_updates(level, location_code, location_name, price_usd_per_month) AS (
  VALUES
    ('region', 'LATAM', 'Latin America', 1200),
    ('region', 'NA', 'North America', 1500),
    ('region', 'EU', 'Europe', 1500),
    ('region', 'ASIA', 'Asia Pacific', 1300),
    ('region', 'MEA', 'Middle East & Africa', 1100),
    ('country', 'US', 'United States', 1200),
    ('country', 'CA', 'Canada', 900),
    ('country', 'MX', 'Mexico', 800),
    ('country', 'BR', 'Brazil', 850),
    ('country', 'AR', 'Argentina', 700),
    ('country', 'CO', 'Colombia', 700),
    ('country', 'CL', 'Chile', 650),
    ('country', 'PE', 'Peru', 600),
    ('country', 'EC', 'Ecuador', 550),
    ('country', 'ES', 'Spain', 900),
    ('country', 'FR', 'France', 1000),
    ('country', 'DE', 'Germany', 1100),
    ('country', 'GB', 'United Kingdom', 1100),
    ('country', 'IT', 'Italy', 900),
    ('country', 'NL', 'Netherlands', 850),
    ('country', 'PT', 'Portugal', 700),
    ('country', 'PL', 'Poland', 650),
    ('country', 'CH', 'Switzerland', 1100),
    ('country', 'BE', 'Belgium', 800),
    ('country', 'JP', 'Japan', 1100),
    ('country', 'KR', 'South Korea', 950),
    ('country', 'CN', 'China', 1100),
    ('country', 'IN', 'India', 750),
    ('country', 'TH', 'Thailand', 650),
    ('country', 'SG', 'Singapore', 900),
    ('country', 'AE', 'UAE', 1000),
    ('country', 'SA', 'Saudi Arabia', 850),
    ('country', 'AU', 'Australia', 1000),
    ('country', 'NZ', 'New Zealand', 750),
    ('city', 'MX-CDMX', 'Mexico City', 500),
    ('city', 'MX-GDL', 'Guadalajara', 350),
    ('city', 'MX-MTY', 'Monterrey', 350),
    ('city', 'MX-CUN', 'Cancun', 450),
    ('city', 'MX-TIJ', 'Tijuana', 300),
    ('city', 'MX-PVR', 'Puerto Vallarta', 350),
    ('city', 'MX-MER', 'Merida', 300),
    ('city', 'MX-QRO', 'Queretaro', 300),
    ('city', 'MX-OAX', 'Oaxaca', 250),
    ('city', 'MX-PBC', 'Puebla', 250),
    ('city', 'US-NYC', 'New York', 900),
    ('city', 'US-LA', 'Los Angeles', 850),
    ('city', 'US-CHI', 'Chicago', 650),
    ('city', 'US-MIA', 'Miami', 700),
    ('city', 'US-SF', 'San Francisco', 850),
    ('city', 'US-LV', 'Las Vegas', 650),
    ('city', 'US-HOU', 'Houston', 550),
    ('city', 'US-DAL', 'Dallas', 550),
    ('city', 'ES-MAD', 'Madrid', 550),
    ('city', 'ES-BCN', 'Barcelona', 550),
    ('city', 'ES-VLC', 'Valencia', 400),
    ('city', 'ES-SEV', 'Seville', 350),
    ('city', 'BR-SAO', 'Sao Paulo', 650),
    ('city', 'BR-RIO', 'Rio de Janeiro', 550),
    ('city', 'AR-BUE', 'Buenos Aires', 450),
    ('city', 'CO-BOG', 'Bogota', 400),
    ('city', 'CO-MDE', 'Medellin', 350),
    ('city', 'CL-SCL', 'Santiago', 400),
    ('city', 'PE-LIM', 'Lima', 350)
)
UPDATE public.ad_inventory_slots s
SET price_usd_per_month = i.price_usd_per_month
FROM inventory_updates i
WHERE s.level = i.level
  AND (
    lower(coalesce(s.location_code, '')) = lower(i.location_code)
    OR lower(coalesce(s.location_name, '')) = lower(i.location_name)
  );