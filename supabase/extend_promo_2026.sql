-- ==============================================================================
-- ACTUALIZACIÓN: Extender promoción piloto hasta Marzo 2026
-- ==============================================================================
-- Fecha: 1 Enero 2026
-- Problema: La promoción expiró el 31 de diciembre 2025
-- ==============================================================================

-- 1. Extender fecha de promoción para todos los planes
UPDATE enterprise_pricing 
SET 
  promo_ends_at = '2026-03-31 23:59:59'::timestamp,
  promo_active = true
WHERE code IN ('city_pack', 'regional', 'national', 'global_event');

-- 2. Verificar que los cambios se aplicaron
SELECT 
  code,
  name,
  regular_price_usd,
  promo_price_usd,
  promo_active,
  promo_ends_at
FROM enterprise_pricing
ORDER BY regular_price_usd ASC;

-- 3. Probar la función RPC
SELECT * FROM get_enterprise_pricing();
