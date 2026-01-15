-- Script para analizar la base de datos de contactos de Geobooker
-- Ejecutar en Supabase SQL Editor para obtener métricas clave

-- ===========================================
-- 1. RESUMEN GENERAL DE CONTACTOS
-- ===========================================
SELECT 
  'TOTAL CONTACTOS' as metrica,
  COUNT(*) as cantidad
FROM enterprise_leads
UNION ALL
SELECT 
  'CON EMAIL' as metrica,
  COUNT(*) as cantidad
FROM enterprise_leads
WHERE email IS NOT NULL 
  AND email != '' 
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
UNION ALL
SELECT 
  'CON TELÉFONO' as metrica,
  COUNT(*) as cantidad
FROM enterprise_leads
WHERE contact_phone IS NOT NULL 
  AND contact_phone != ''
  AND LENGTH(contact_phone) >= 10;

-- ===========================================
-- 2.DISTRIBUCIÓN POR TIER
-- ===========================================
SELECT 
  tier,
  COUNT(*) as total,
  COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as con_email,
  COUNT(CASE WHEN contact_phone IS NOT NULL AND contact_phone != '' THEN 1 END) as con_telefono,
  ROUND(
    (COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END)::numeric / COUNT(*)) * 100, 
    2
  ) as "% con email"
FROM enterprise_leads
GROUP BY tier
ORDER BY 
  CASE tier
    WHEN 'AAA' THEN 1
    WHEN 'AA' THEN 2
    WHEN 'A' THEN 3
    WHEN 'B' THEN 4
    ELSE 5
  END;

-- ===========================================
-- 3. CONTACTOS POR CATEGORÍA (Top 10)
-- ===========================================
SELECT 
  category,
  COUNT(*) as total,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as con_email
FROM enterprise_leads
WHERE category IS NOT NULL
GROUP BY category
ORDER BY total DESC
LIMIT 10;

-- ===========================================
-- 4. ESTADO DE CAMPAÑAS (si existe marketing_history)
-- ===========================================
SELECT 
  COALESCE(sent_via, 'SIN ENVIAR') as estado,
  COUNT(*) as cantidad
FROM enterprise_leads el
LEFT JOIN marketing_history mh ON el.id = mh.contact_id
GROUP BY sent_via;

-- ===========================================
-- 5. CONTACTOS LISTOS PARA ENVÍO (nunca contactados)
-- ===========================================
SELECT 
  tier,
  COUNT(*) as listos_para_envio
FROM enterprise_leads el
WHERE email IS NOT NULL 
  AND email != ''
  AND NOT EXISTS (
    SELECT 1 FROM marketing_history mh 
    WHERE mh.contact_id = el.id
  )
GROUP BY tier
ORDER BY 
  CASE tier
    WHEN 'AAA' THEN 1
    WHEN 'AA' THEN 2
    WHEN 'A' THEN 3
    WHEN 'B' THEN 4
  END;

-- ===========================================
-- 6. PROYECCIÓN DE DÍAS NECESARIOS
-- ===========================================
WITH contactos_pendientes AS (
  SELECT COUNT(*) as total
  FROM enterprise_leads
  WHERE email IS NOT NULL 
    AND email != ''
    AND NOT EXISTS (
      SELECT 1 FROM marketing_history mh 
      WHERE mh.contact_id = enterprise_leads.id
    )
)
SELECT 
  total as "Contactos pendientes",
  CEIL(total::numeric / 800) as "Días necesarios (800/día)",
  CEIL(total::numeric / 500) as "Días necesarios (500/día)",
  CEIL(total::numeric / 100) as "Días necesarios (100/día - warming)"
FROM contactos_pendientes;
