-- ==============================================================================
-- MIGRACIÓN: ACTUALIZAR PRECIOS ENTERPRISE → 5 TIERS CALIBRADOS AL MERCADO
-- ==============================================================================
-- Fecha: 17 Marzo 2026
-- Contexto: Los precios originales ($2,500-$50,000) estaban sobredimensionados 
-- para una plataforma en etapa temprana. Se recalibraron con base en análisis 
-- competitivo (Waze, Yelp, Google Ads) y se diferenciaron descuentos por tier.
-- ==============================================================================

-- 1. ELIMINAR REGISTROS VIEJOS
DELETE FROM enterprise_pricing WHERE code IN ('city_pack', 'national', 'global_event');

-- 2. ACTUALIZAR REGIONAL (mismo code, nuevos precios)
UPDATE enterprise_pricing SET
  name = 'Regional Pack',
  description = 'Hasta 5 ciudades activas en 2 países, 3 meses de campaña',
  regular_price_usd = 2490,
  regular_price_mxn = 44820,  -- ~18x tipo cambio
  regular_price_eur = 2290,
  promo_price_usd = 1990,
  promo_price_mxn = 35820,
  promo_price_eur = 1790,
  cities_included = 5,
  duration_months = 3,
  features = '["Hasta 5 ciudades activas", "Rotación de inventario patrocinado", "Dashboard por ciudad", "2 optimizaciones incluidas", "Soporte prioritario"]'::jsonb,
  promo_active = true,
  promo_ends_at = '2026-08-01 23:59:59'::timestamp
WHERE code = 'regional';

-- 3. INSERTAR NUEVOS TIERS
INSERT INTO enterprise_pricing (code, name, description,
  regular_price_usd, regular_price_mxn, regular_price_eur,
  promo_price_usd, promo_price_mxn, promo_price_eur,
  cities_included, duration_months, features, promo_active, promo_ends_at)
VALUES
  -- City Launch: Producto de entrada, 1 ciudad, 1 mes
  ('city_launch', 'City Launch', '1 ciudad activa por 1 mes — ideal para validar mercado',
    390, 7020, 360,
    290, 5220, 270,
    1, 1,
    '["1 ciudad activa", "Búsqueda patrocinada", "1 placement destacado en ciudad o categoría", "Pin patrocinado en mapa", "Dashboard básico"]'::jsonb,
    true, '2026-08-01 23:59:59'),

  -- Country Select: 1 país, hasta 12 ciudades, 3 meses
  ('country', 'Country Select', '1 país, hasta 12 ciudades activas, 3 meses de campaña',
    4900, 88200, 4500,
    3900, 70200, 3600,
    12, 3,
    '["Hasta 12 ciudades dentro de un país", "Placements premium en territorios seleccionados", "Dashboard por ciudad/dispositivo/horario", "Revisión mensual de desempeño", "Soporte prioritario"]'::jsonb,
    true, '2026-08-01 23:59:59'),

  -- Cross-Border Event: 2-3 países, campañas por evento/temporada
  ('crossborder', 'Cross-Border Event', '2-3 países o región específica, campañas de 2-3 meses',
    8900, 160200, 8200,
    6900, 124200, 6400,
    30, 3,
    '["2-3 países o región continental", "Segmentación por idioma", "Flight por evento o temporada", "Reporte ejecutivo final", "Soporte consultivo dedicado"]'::jsonb,
    true, '2026-08-01 23:59:59'),

  -- Global Custom: Cotización, multi-país
  ('global_custom', 'Global Custom', 'Cobertura multi-país o continental, bajo propuesta personalizada',
    9900, 178200, 9100,
    9900, 178200, 9100,
    999, 3,
    '["Multi-país o continental", "Setup de campaña a medida", "Inventario premium asignado", "Reporting ejecutivo personalizado", "Propuesta comercial y fiscal a medida"]'::jsonb,
    false, '2026-08-01 23:59:59')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  regular_price_usd = EXCLUDED.regular_price_usd,
  regular_price_mxn = EXCLUDED.regular_price_mxn,
  regular_price_eur = EXCLUDED.regular_price_eur,
  promo_price_usd = EXCLUDED.promo_price_usd,
  promo_price_mxn = EXCLUDED.promo_price_mxn,
  promo_price_eur = EXCLUDED.promo_price_eur,
  cities_included = EXCLUDED.cities_included,
  duration_months = EXCLUDED.duration_months,
  features = EXCLUDED.features,
  promo_active = EXCLUDED.promo_active,
  promo_ends_at = EXCLUDED.promo_ends_at;


-- 4. AGREGAR COLUMNA discount_percent SI NO EXISTE
ALTER TABLE enterprise_pricing ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE enterprise_pricing ADD COLUMN IF NOT EXISTS countries_included INTEGER DEFAULT 1;

-- 5. ACTUALIZAR discount_percent POR TIER
UPDATE enterprise_pricing SET discount_percent = 25, countries_included = 1 WHERE code = 'city_launch';
UPDATE enterprise_pricing SET discount_percent = 20, countries_included = 2 WHERE code = 'regional';
UPDATE enterprise_pricing SET discount_percent = 20, countries_included = 1 WHERE code = 'country';
UPDATE enterprise_pricing SET discount_percent = 22, countries_included = 3 WHERE code = 'crossborder';
UPDATE enterprise_pricing SET discount_percent = 0, countries_included = 999 WHERE code = 'global_custom';


-- 6. RECREAR RPC CON DESCUENTOS VARIABLES (ya no hardcodea 50%)
-- DROP primero porque cambiamos el return type (agregamos countries_included)
DROP FUNCTION IF EXISTS get_enterprise_pricing();
CREATE OR REPLACE FUNCTION get_enterprise_pricing()
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
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() 
         THEN ep.promo_price_usd 
         ELSE ep.regular_price_usd 
    END as current_price_usd,
    ep.regular_price_mxn,
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() 
         THEN ep.promo_price_mxn 
         ELSE ep.regular_price_mxn 
    END as current_price_mxn,
    -- Descuento variable por tier (ya no hardcodeado a 50%)
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() 
         THEN ep.discount_percent 
         ELSE 0 
    END as discount_percent,
    ep.promo_active AND ep.promo_ends_at > NOW() as is_promo_active,
    ep.promo_ends_at,
    ep.cities_included,
    ep.countries_included,
    ep.duration_months,
    ep.features
  FROM enterprise_pricing ep
  WHERE ep.is_active = true
  ORDER BY ep.regular_price_usd ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. VERIFICAR
SELECT code, name, regular_price_usd, 
       CASE WHEN promo_active THEN promo_price_usd ELSE regular_price_usd END as current_price,
       discount_percent, cities_included, countries_included, duration_months
FROM enterprise_pricing 
WHERE is_active = true
ORDER BY regular_price_usd ASC;

-- ==============================================================================
-- RESULTADO ESPERADO:
-- city_launch   | City Launch        | $390   → $290  (25% OFF) | 1 city  | 1 mo
-- regional      | Regional Pack      | $2,490 → $1,990 (20% OFF) | 5 cities | 3 mo
-- country       | Country Select     | $4,900 → $3,900 (20% OFF) | 12 cities | 3 mo
-- crossborder   | Cross-Border Event | $8,900 → $6,900 (22% OFF) | 30 cities | 3 mo
-- global_custom | Global Custom      | $9,900 (sin promo)        | 999     | 3 mo
-- ==============================================================================
