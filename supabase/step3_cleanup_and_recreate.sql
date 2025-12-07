-- ==========================================================
-- PASO 3: LIMPIEZA COMPLETA Y REINSERCIÓN
-- ==========================================================
-- ⚠️ ESTE SCRIPT BORRARÁ TODOS LOS ESPACIOS Y LOS RECREARÁ
-- Solo ejecutar después de revisar PASO 1 y PASO 2

-- 1. Eliminar TODOS los espacios actuales
DELETE FROM ad_spaces;

-- 2. Insertar la lista definitiva de 7 espacios
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
  
  -- ESPACIO ADICIONAL (El 7mo - Variante de Resultados Patrocinados)
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
  );

-- 3. Verificar resultado
SELECT 
  ROW_NUMBER() OVER (ORDER BY 
    CASE type
      WHEN '1ra_plana' THEN 1
      WHEN '2da_plana' THEN 2
      WHEN 'interstitial' THEN 3
    END,
    name
  ) as "#",
  name,
  display_name,
  type,
  CONCAT('$', price_monthly) as precio,
  max_slots as slots,
  is_active as activo
FROM ad_spaces
ORDER BY "#";
