-- ==========================================================
-- PASO 1: VER TODOS LOS ESPACIOS ACTUALES
-- ==========================================================
-- Ejecuta SOLO esta consulta primero para ver qué hay en la base de datos

SELECT 
  id,
  name,
  display_name,
  type,
  size_desktop,
  size_mobile,
  price_monthly,
  max_slots,
  is_active,
  created_at
FROM ad_spaces
ORDER BY name, created_at;
