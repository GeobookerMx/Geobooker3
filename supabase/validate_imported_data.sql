-- ============================================================
-- VALIDACIÓN POST-IMPORTACIÓN Y REPORTES DE CALIDAD
-- ============================================================
-- Ejecutar DESPUÉS de import_contacts.sql

-- ============================================================
-- 1. REPORTE DE CALIDAD DE DATOS
-- ============================================================

SELECT '═══════════════════════════════════════════' as separador;
SELECT '📊 REPORTE DE CALIDAD DE IMPORTACIÓN' as titulo;
SELECT '═══════════════════════════════════════════' as separador;

-- Estadísticas generales
SELECT 
  '1. TOTALES' as seccion,
  COUNT(*) as "Total Contactos",
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as "Con Email",
  COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as "Con Teléfono",
  COUNT(CASE WHEN email IS NOT NULL AND phone IS NOT NULL THEN 1 END) as "Email + Teléfono",
  ROUND(
    (COUNT(CASE WHEN email IS NOT NULL THEN 1 END)::numeric / COUNT(*)) * 100, 
    2
  ) as "% Con Email"
FROM marketing_contacts;

-- Distribución por tier
SELECT 
  '2. DISTRIBUCIÓN POR TIER' as seccion,
  tier,
  COUNT(*) as cantidad,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM marketing_contacts)) * 100, 2) as porcentaje,
  assigned_email_sender as cuenta_asignada
FROM marketing_contacts
GROUP BY tier, assigned_email_sender
ORDER BY 
  CASE tier
    WHEN 'AAA' THEN 1
    WHEN 'AA' THEN 2
    WHEN 'A' THEN 3
    WHEN 'B' THEN 4
    ELSE 5
  END;

-- Distribución por cuenta de envío
SELECT 
  '3. DISTRIBUCIÓN POR CUENTA' as seccion,
  assigned_email_sender as cuenta,
  COUNT(*) as contactos_asignados,
  STRING_AGG(DISTINCT tier, ', ' ORDER BY tier) as tiers_incluidos,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM marketing_contacts)) * 100, 2) as porcentaje
FROM marketing_contacts
GROUP BY assigned_email_sender;

-- Top 10 ciudades
SELECT 
  '4. TOP 10 CIUDADES' as seccion,
  city,
  COUNT(*) as contactos,
  COUNT(CASE WHEN tier IN ('AAA', 'AA') THEN 1 END) as premium_contacts
FROM marketing_contacts
WHERE city IS NOT NULL
GROUP BY city
ORDER BY contactos DESC
LIMIT 10;

-- Top 10 categorías/tipos
SELECT 
  '5. TOP 10 CATEGORÍAS' as seccion,
  category,
  COUNT(*) as contactos,
  STRING_AGG(DISTINCT tier, ', ') as tiers
FROM marketing_contacts
WHERE category IS NOT NULL
GROUP BY category
ORDER BY contactos DESC
LIMIT 10;

-- ============================================================
-- 2. DETECCIÓN DE PROBLEMAS POTENCIALES
-- ============================================================

SELECT '═══════════════════════════════════════════' as separador;
SELECT '⚠️ REVISIÓN DE CALIDAD' as titulo;
SELECT '═══════════════════════════════════════════' as separador;

-- 2.1 Emails sospechosos (dominios genéricos)
SELECT 
  '❌ Emails con dominios genéricos' as alerta,
  COUNT(*) as cantidad
FROM marketing_contacts
WHERE email ~* '(gmail\.com|hotmail\.com|yahoo\.com|outlook\.com)$';

-- Mostrar algunos ejemplos
SELECT 
  'Ejemplos de emails genéricos' as tipo,
  company_name,
  email,
  tier
FROM marketing_contacts
WHERE email ~* '(gmail\.com|hotmail\.com|yahoo\.com|outlook\.com)$'
LIMIT 10;

-- 2.2 Contactos sin nombre
SELECT 
  '⚠️ Contactos sin nombre de persona' as alerta,
  COUNT(*) as cantidad
FROM marketing_contacts
WHERE contact_name IS NULL OR contact_name = '';

-- 2.3 Teléfonos con formato sospechoso
SELECT 
  '⚠️ Teléfonos con formato inválido' as alerta,
  COUNT(*) as cantidad
FROM marketing_contacts
WHERE phone IS NOT NULL 
  AND (LENGTH(phone) < 10 OR LENGTH(phone) > 15 OR phone !~ '^[0-9+]+$');

-- ============================================================
-- 3. VERIFICAR DUPLICADOS (NO DEBERÍAN EXISTIR)
-- ============================================================

SELECT '═══════════════════════════════════════════' as separador;
SELECT '🔍 VERIFICACIÓN DE DUPLICADOS' as titulo;
SELECT '═══════════════════════════════════════════' as separador;

-- 3.1 Duplicados por email (NO deberían existir si el unique constraint funciona)
WITH email_duplicates AS (
  SELECT 
    email,
    COUNT(*) as veces_repetido,
    STRING_AGG(company_name, ' | ') as empresas
  FROM marketing_contacts
  GROUP BY email
  HAVING COUNT(*) > 1
)
SELECT 
  '❌ Emails duplicados encontrados' as alerta,
  COALESCE(SUM(veces_repetido), 0) as total_duplicados,
  COALESCE(COUNT(*), 0) as emails_afectados
FROM email_duplicates;

-- Mostrar duplicados si existen
SELECT 
  'DUPLICADOS DETECTADOS' as tipo,
  email,
  veces_repetido,
  empresas
FROM (
  SELECT 
    email,
    COUNT(*) as veces_repetido,
    STRING_AGG(company_name, ' | ') as empresas
  FROM marketing_contacts
  GROUP BY email
  HAVING COUNT(*) > 1
) AS dups
LIMIT 20;

-- ============================================================
-- 4. PROYECCIÓN DE CAMPAÑA
-- ============================================================

SELECT '═══════════════════════════════════════════' as separador;
SELECT '📅 PROYECCIÓN DE CAMPAÑA' as titulo;
SELECT '═══════════════════════════════════════════' as separador;

WITH campaign_projection AS (
  SELECT 
    COUNT(*) as total_contactos,
    COUNT(CASE WHEN tier = 'AAA' THEN 1 END) as tier_aaa,
    COUNT(CASE WHEN tier = 'AA' THEN 1 END) as tier_aa,
    COUNT(CASE WHEN tier = 'A' THEN 1 END) as tier_a,
    COUNT(CASE WHEN tier = 'B' THEN 1 END) as tier_b
  FROM marketing_contacts
  WHERE email_status = 'pending'
)
SELECT 
  'PROYECCIÓN CON 800 EMAILS/DÍA' as escenario,
  total_contactos as "Total a Contactar",
  CEIL(total_contactos::numeric / 800) as "Días Necesarios",
  TO_CHAR(NOW() + (CEIL(total_contactos::numeric / 800) || ' days')::INTERVAL, 'DD/MM/YYYY') as "Fecha Finalización",
  800 as "Emails por Día"
FROM campaign_projection

UNION ALL

SELECT 
  'PROYECCIÓN CON 500 EMAILS/DÍA (WARMING)' as escenario,
  total_contactos,
  CEIL(total_contactos::numeric / 500),
  TO_CHAR(NOW() + (CEIL(total_contactos::numeric / 500) || ' days')::INTERVAL, 'DD/MM/YYYY'),
  500
FROM campaign_projection

UNION ALL

SELECT 
  'PROYECCIÓN CON 100 EMAILS/DÍA (INICIO)' as escenario,
  total_contactos,
  CEIL(total_contactos::numeric / 100),
  TO_CHAR(NOW() + (CEIL(total_contactos::numeric / 100) || ' days')::INTERVAL, 'DD/MM/YYYY'),
  100
FROM campaign_projection;

-- ============================================================
-- 5. ANÁLISIS DE DOMINIOS (TOP EMPRESAS)
-- ============================================================

SELECT '═══════════════════════════════════════════' as separador;
SELECT '🏢 TOP 20 DOMINIOS CORPORATIVOS' as titulo;
SELECT '═══════════════════════════════════════════' as separador;

SELECT 
  SUBSTRING(email FROM '@(.*)$') as dominio,
  COUNT(*) as contactos,
  STRING_AGG(DISTINCT tier, ', ' ORDER BY tier) as tiers,
  STRING_AGG(DISTINCT company_name, ', ') FILTER (WHERE company_name IS NOT NULL) as empresas_ejemplo
FROM marketing_contacts
WHERE email !~* '(gmail|hotmail|yahoo|outlook)\.com$' -- Excluir genéricos
GROUP BY dominio
ORDER BY contactos DESC
LIMIT 20;

-- ============================================================
-- 6. CREAR VISTA PARA DASHBOARD
-- ============================================================

CREATE OR REPLACE VIEW marketing_quality_dashboard AS
SELECT 
  -- Totales
  (SELECT COUNT(*) FROM marketing_contacts) as total_contactos,
  (SELECT COUNT(*) FROM marketing_contacts WHERE email IS NOT NULL) as con_email_valido,
  (SELECT COUNT(*) FROM marketing_contacts WHERE phone IS NOT NULL) as con_telefono_valido,
  
  -- Por tier
  (SELECT COUNT(*) FROM marketing_contacts WHERE tier = 'AAA') as tier_aaa,
  (SELECT COUNT(*) FROM marketing_contacts WHERE tier = 'AA') as tier_aa,
  (SELECT COUNT(*) FROM marketing_contacts WHERE tier = 'A') as tier_a,
  (SELECT COUNT(*) FROM marketing_contacts WHERE tier = 'B') as tier_b,
  
  -- Por cuenta
  (SELECT COUNT(*) FROM marketing_contacts WHERE assigned_email_sender = 'ventasgeobooker@gmail.com') as cuenta_ventas,
  (SELECT COUNT(*) FROM marketing_contacts WHERE assigned_email_sender = 'geobookerr@gmail.com') as cuenta_general,
  
  -- Estados
  (SELECT COUNT(*) FROM marketing_contacts WHERE email_status = 'pending') as pendientes,
  (SELECT COUNT(*) FROM marketing_contacts WHERE email_status = 'sent') as enviados,
  
  -- Calidad
  (SELECT COUNT(*) FROM marketing_contacts WHERE email ~* '(gmail|hotmail|yahoo|outlook)\.com$') as emails_genericos,
  (SELECT ROUND(AVG(LENGTH(email)), 2) FROM marketing_contacts WHERE email IS NOT NULL) as email_length_promedio,
  
  -- Proyección
  (SELECT CEIL((COUNT(*)::numeric / 800)) FROM marketing_contacts WHERE email_status = 'pending') as dias_para_completar_800,
  (SELECT CEIL((COUNT(*)::numeric / 500)) FROM marketing_contacts WHERE email_status = 'pending') as dias_para_completar_500;

-- Ver dashboard
SELECT * FROM marketing_quality_dashboard;

SELECT '═══════════════════════════════════════════' as separador;
SELECT '✅ VALIDACIÓN COMPLETADA' as titulo;
SELECT '═══════════════════════════════════════════' as separador;
