-- Corregir precio de "Resultados Patrocinados (Ancho Completo)"
-- El valor estaba en $12 MXN pero debería ser $12,000 MXN

UPDATE ad_spaces 
SET price_monthly = 12000 
WHERE name = 'sponsored_results_full_width' 
   OR display_name ILIKE '%Ancho Completo%'
   OR display_name ILIKE '%Full Width%';

-- Verificar el cambio
SELECT id, name, display_name, price_monthly 
FROM ad_spaces 
WHERE price_monthly < 100;
