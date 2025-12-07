-- ==========================================================
-- SCRIPT DE DIAGNÓSTICO Y LIMPIEZA DE ESPACIOS PUBLICITARIOS
-- ==========================================================

-- 1. VER TODOS LOS ESPACIOS ACTUALES (incluye duplicados)
SELECT 
  id,
  name,
  display_name,
  type,
  position,
  size_desktop,
  size_mobile,
  price_monthly,
  max_slots,
  is_active,
  created_at
FROM ad_spaces
ORDER BY type, name;

-- 2. IDENTIFICAR DUPLICADOS POR NOMBRE
SELECT 
  name,
  COUNT(*) as cantidad,
  ARRAY_AGG(id) as ids
FROM ad_spaces
GROUP BY name
HAVING COUNT(*) > 1;

-- 3. ELIMINAR DUPLICADOS (CONSERVAR EL MÁS RECIENTE)
-- ⚠️ SOLO EJECUTAR DESPUÉS DE REVISAR LOS RESULTADOS DE LAS CONSULTAS ANTERIORES
/*
WITH ranked_spaces AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
  FROM ad_spaces
)
DELETE FROM ad_spaces
WHERE id IN (
  SELECT id FROM ranked_spaces WHERE rn > 1
);
*/

-- 4. DEFINIR ESPACIOS CORRECTOS (LA VERSIÓN DEFINITIVA)
-- Primero limpiamos TODO
DELETE FROM ad_spaces;

-- Ahora insertamos la lista definitiva de 7 espacios
INSERT INTO ad_spaces (
  name, 
  display_name, 
  type, 
  position, 
  size_desktop, 
  size_mobile, 
  price_monthly, 
  max_slots, 
  is_active,
  description
) VALUES
  -- 1RA PLANA (Alta Visibilidad)
  (
    'hero_banner', 
    'Banner Principal', 
    '1ra_plana', 
    'top', 
    '728x90', 
    '320x100', 
    1500.00, 
    3,
    true,
    'Banner principal debajo de la barra de búsqueda'
  ),
  (
    'featured_carousel', 
    'Carrusel Destacado', 
    '1ra_plana', 
    'middle', 
    '280x200', 
    '280x200', 
    800.00, 
    10,
    true,
    'Carrusel de negocios destacados antes de resultados'
  ),
  (
    'sponsored_results', 
    'Resultados Patrocinados', 
    '1ra_plana', 
    'middle', 
    'list', 
    'list', 
    1.50, 
    3,
    true,
    'Primeros resultados en búsqueda (precio por clic)'
  ),
  
  -- 2DA PLANA (Visibilidad Media)
  (
    'recommended_section', 
    'Recomendados para Ti', 
    '2da_plana', 
    'middle', 
    '250x300', 
    '250x300', 
    250.00, 
    4,
    true,
    'Sección de negocios recomendados debajo del mapa'
  ),
  (
    'bottom_banner', 
    'Banner Inferior Sticky', 
    '2da_plana', 
    'bottom', 
    '728x90', 
    '320x50', 
    1000.00, 
    2,
    true,
    'Banner sticky en parte inferior del mapa'
  ),
  
  -- INTERSTITIAL (Máximo Impacto)
  (
    'interstitial', 
    'Pantalla Completa', 
    'interstitial', 
    'fullscreen', 
    '800x600', 
    '100%', 
    5000.00, 
    1,
    true,
    'Anuncio de pantalla completa (ocasional)'
  ),
  
  -- ESPACIO ADICIONAL (El 7mo que aparece en tu lista)
  -- Basándome en tu captura, parece ser otra variante de Resultados Patrocinados
  (
    'sponsored_results_fullwidth', 
    'Resultados Patrocinados (Ancho Completo)', 
    '1ra_plana', 
    'middle', 
    '100%', 
    '100%', 
    1.50, 
    3,
    true,
    'Resultados patrocinados en formato ancho completo'
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  type = EXCLUDED.type,
  position = EXCLUDED.position,
  size_desktop = EXCLUDED.size_desktop,
  size_mobile = EXCLUDED.size_mobile,
  price_monthly = EXCLUDED.price_monthly,
  max_slots = EXCLUDED.max_slots,
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description;

-- 5. VERIFICAR RESULTADO FINAL
SELECT 
  ROW_NUMBER() OVER (ORDER BY 
    CASE type
      WHEN '1ra_plana' THEN 1
      WHEN '2da_plana' THEN 2
      WHEN 'interstitial' THEN 3
    END,
    name
  ) as num,
  name,
  display_name,
  type,
  price_monthly,
  max_slots,
  is_active
FROM ad_spaces
ORDER BY num;
