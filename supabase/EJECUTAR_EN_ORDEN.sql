-- ==========================================================
-- GUÍA DE EJECUCIÓN: Limpieza de BD y Configuración Geográfica
-- ==========================================================

-- ORDEN DE EJECUCIÓN:
-- 1. step1_view_current_spaces.sql  (ver estado actual)
-- 2. step2_find_duplicates.sql      (identificar duplicados)
-- 3. step3_cleanup_and_recreate.sql (limpieza de espacios)
-- 4. geographic_segmentation.sql    (tablas de segmentación)

-- ==========================================================
-- ¿QUÉ HACE ESTE PROCESO?
-- ==========================================================

/*
PASO 1-3: Limpieza de Espacios Publicitarios
---------------------------------------------
Elimina duplicados y establece exactamente 7 espacios definitivos:
1. Banner Principal ($1,500/mes)
2. Carrusel Destacado ($800/mes)
3. Resultados Patrocinados ($1.5/clic)
4. Resultados Patrocinados Full Width ($1.5/clic)
5. Recomendados para Ti ($250/mes)
6. Banner Inferior Sticky ($1,000/mes)
7. Pantalla Completa ($5,000/mes)

PASO 4: Segmentación Geográfica
--------------------------------
Crea tablas de referencia para permitir segmentación en 4 niveles:
- GLOBAL: Todo el mundo
- COUNTRY: Por país (MX, US, ES, etc.)
- REGION: Por estado/provincia (CMX, CA, MAD, etc.)
- CITY: Por ciudad (Guadalajara, Miami, Barcelona, etc.)

Incluye datos iniciales para:
- 🇲🇽 México: 10 estados, ~15 ciudades principales
- 🇺🇸 USA: 7 estados, ~10 ciudades principales
- 🇪🇸 España: 6 comunidades, ~6 ciudades principales
*/

-- ==========================================================
-- VERIFICACIÓN FINAL
-- ==========================================================

-- Ver espacios publicitarios (deberían ser exactamente 7)
SELECT COUNT(*) as total_espacios FROM ad_spaces;

-- Ver datos geográficos
SELECT 
  'Regiones' as tipo,
  country_code as pais,
  COUNT(*) as cantidad
FROM geographic_regions
GROUP BY country_code
UNION ALL
SELECT 
  'Ciudades' as tipo,
  country_code as pais,
  COUNT(*) as cantidad
FROM geographic_cities
GROUP BY country_code
ORDER BY tipo, pais;
