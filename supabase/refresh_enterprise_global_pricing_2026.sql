-- ==============================================================================
-- GEOBOOKER ENTERPRISE: PROMO GLOBAL 70% OFF
-- Vigencia: hasta el 1 de septiembre de 2026
-- Usa este script como referencia vigente para pricing enterprise.
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
  (
    'city_launch',
    'City Launch',
    '1 ciudad activa por 1 mes - ideal para validar mercado',
    390, 7020, 360,
    117, 2106, 108,
    70,
    1, 1, 1,
    '["1 ciudad activa", "Busqueda patrocinada", "1 placement destacado en ciudad o categoria", "Pin patrocinado en mapa", "Dashboard basico"]'::jsonb,
    true,
    '2026-09-01 23:59:59+00',
    true
  ),
  (
    'regional',
    'Regional Pack',
    'Hasta 5 ciudades activas en 2 paises, 3 meses de campana',
    2490, 44820, 2290,
    747, 13446, 687,
    70,
    5, 2, 3,
    '["Hasta 5 ciudades activas", "Rotacion de inventario patrocinado", "Dashboard por ciudad", "2 optimizaciones incluidas", "Soporte prioritario"]'::jsonb,
    true,
    '2026-09-01 23:59:59+00',
    true
  ),
  (
    'country',
    'Country Select',
    '1 pais, hasta 12 ciudades activas, 3 meses de campana',
    4900, 88200, 4500,
    1470, 26460, 1350,
    70,
    12, 1, 3,
    '["Hasta 12 ciudades dentro de un pais", "Placements premium en territorios seleccionados", "Dashboard por ciudad/dispositivo/horario", "Revision mensual de desempeno", "Soporte prioritario"]'::jsonb,
    true,
    '2026-09-01 23:59:59+00',
    true
  ),
  (
    'crossborder',
    'Cross-Border Event',
    '2-3 paises o region especifica, campanas de 2-3 meses',
    8900, 160200, 8200,
    2670, 48060, 2460,
    70,
    30, 3, 3,
    '["2-3 paises o region continental", "Segmentacion por idioma", "Flight por evento o temporada", "Reporte ejecutivo final", "Soporte consultivo dedicado"]'::jsonb,
    true,
    '2026-09-01 23:59:59+00',
    true
  ),
  (
    'global_custom',
    'Global Custom',
    'Cobertura multi-pais o continental, bajo propuesta personalizada',
    9900, 178200, 9100,
    2970, 53460, 2730,
    70,
    999, 999, 3,
    '["Multi-pais o continental", "Setup de campana a medida", "Inventario premium asignado", "Reporting ejecutivo personalizado", "Propuesta comercial y fiscal a medida"]'::jsonb,
    true,
    '2026-09-01 23:59:59+00',
    true
  )
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

SELECT
  code,
  name,
  regular_price_usd,
  promo_price_usd,
  discount_percent,
  promo_active,
  promo_ends_at
FROM public.enterprise_pricing
WHERE is_active = true
ORDER BY regular_price_usd ASC;
