-- ==========================================================
-- VERIFICACIÓN COMPLETA DEL SISTEMA
-- ==========================================================
-- Ejecuta este script para verificar que TODO se instaló correctamente

-- 1. Verificar espacios publicitarios (deben ser exactamente 7)
SELECT 
  '1. ESPACIOS PUBLICITARIOS' as seccion,
  COUNT(*) as total,
  CASE 
    WHEN COUNT(*) = 7 THEN '✅ CORRECTO'
    ELSE '❌ ERROR: Deberían ser 7'
  END as estado
FROM ad_spaces;

-- 2. Listar los 7 espacios
SELECT 
  '2. DETALLE DE ESPACIOS' as seccion,
  ROW_NUMBER() OVER (ORDER BY 
    CASE type
      WHEN '1ra_plana' THEN 1
      WHEN '2da_plana' THEN 2
      WHEN 'interstitial' THEN 3
    END,
    name
  ) as "#",
  display_name,
  type,
  CONCAT('$', price_monthly) as precio
FROM ad_spaces
ORDER BY "#";

-- 3. Verificar tablas geográficas
SELECT 
  '3. TABLAS GEOGRÁFICAS' as seccion,
  'geographic_regions' as tabla,
  COUNT(*) as registros
FROM geographic_regions
UNION ALL
SELECT 
  '3. TABLAS GEOGRÁFICAS' as seccion,
  'geographic_cities' as tabla,
  COUNT(*) as registros
FROM geographic_cities;

-- 4. Resumen por país
SELECT 
  '4. DATOS POR PAÍS' as seccion,
  r.country_code as pais,
  COUNT(DISTINCT r.id) as regiones,
  COUNT(c.id) as ciudades
FROM geographic_regions r
LEFT JOIN geographic_cities c ON r.id = c.region_id
GROUP BY r.country_code
ORDER BY r.country_code;

-- 5. Verificar que no hay duplicados en ad_spaces
SELECT 
  '5. DUPLICADOS EN ESPACIOS' as seccion,
  name,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ OK'
    ELSE '❌ DUPLICADO!'
  END as estado
FROM ad_spaces
GROUP BY name
ORDER BY cantidad DESC, name;
