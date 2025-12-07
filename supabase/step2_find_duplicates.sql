-- ==========================================================
-- PASO 2: IDENTIFICAR DUPLICADOS
-- ==========================================================
-- Esta consulta te mostrará cuántas veces aparece cada espacio

SELECT 
  name,
  COUNT(*) as cantidad,
  STRING_AGG(display_name, ', ') as nombres,
  ARRAY_AGG(id::text) as ids
FROM ad_spaces
GROUP BY name
ORDER BY cantidad DESC, name;
