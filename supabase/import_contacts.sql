-- ============================================================
-- SCRIPT DE IMPORTACIÓN Y VALIDACIÓN DE CONTACTOS
-- ============================================================
-- Archivo: Empresarial AAA AA A y B.csv (1 millón+ registros)
-- Fecha: 2026-01-15
-- 
-- FUNCIONALIDADES:
-- ✅ Validación de emails (formato, dominios válidos)
-- ✅ Detección de duplicados (email, nombre+empresa)
-- ✅ Limpieza de caracteres especiales
-- ✅ Clasificación automática por tier
-- ✅ Reportes de calidad de datos
-- ============================================================

-- PASO 1: Crear tabla temporal para importación
CREATE TEMP TABLE IF NOT EXISTS temp_import (
  compania TEXT,
  puesto TEXT,
  nombre TEXT,
  email TEXT,
  tipo TEXT,
  tamano TEXT,
  personal TEXT,
  colonia TEXT,
  codigo_postal TEXT,
  ciudad TEXT,
  telefono TEXT,
  otro TEXT
);

-- PASO 2: Importar CSV
-- En Supabase Dashboard:
-- 1. Table Editor → Create Table → Import from CSV
-- 2. Seleccionar archivo "Empresarial AAA AA A y B.csv"
-- 3. Mapear columnas a temp_import
-- 4. Click Import

-- PASO 3: VALIDACIÓN Y LIMPIEZA EXHAUSTIVA

-- 3.1 Crear tabla de estadísticas ANTES de limpiar
CREATE TEMP TABLE import_stats AS
SELECT 
  COUNT(*) as total_registros_raw,
  COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as con_email,
  COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as sin_email,
  COUNT(DISTINCT email) as emails_unicos,
  COUNT(*) - COUNT(DISTINCT email) as emails_duplicados_potenciales
FROM temp_import;

-- 3.2 Limpiar emails (lowercase, trim, quitar espacios)
UPDATE temp_import SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;

-- 3.3 VALIDACIÓN ROBUSTA DE EMAILS
CREATE TEMP TABLE email_validation_log AS
SELECT 
  email,
  CASE
    -- Email vacío
    WHEN email IS NULL OR email = '' THEN 'SIN_EMAIL'
    
    -- Email inválido (formato incorrecto)
    WHEN email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN 'FORMATO_INVALIDO'
    
    -- Dominios temporales/desechables (spam)
    WHEN email ~* '(temp|disposable|trash|guerrillamail|10minutemail|mailinator|yopmail)' THEN 'DOMINIO_TEMPORAL'
    
    -- Emails de prueba
    WHEN email ~* '(test|prueba|ejemplo|example|demo|fake|noemail)' THEN 'EMAIL_PRUEBA'
    
    -- Email demasiado corto (menos de 5 chars)
    WHEN LENGTH(email) < 5 THEN 'DEMASIADO_CORTO'
    
    -- Email válido
    ELSE 'VALIDO'
  END as estado_validacion,
  
  -- Extraer dominio para análisis
  SUBSTRING(email FROM '@(.*)$') as dominio
  
FROM temp_import
WHERE email IS NOT NULL;

-- 3.4 Eliminar emails inválidos
DELETE FROM temp_import 
WHERE email IN (
  SELECT email FROM email_validation_log 
  WHERE estado_validacion != 'VALIDO'
);

-- 3.5 DETECCIÓN Y ELIMINACIÓN DE DUPLICADOS

-- Crear tabla de duplicados por EMAIL
CREATE TEMP TABLE duplicados_email AS
SELECT 
  email,
  COUNT(*) as veces_repetido,
  STRING_AGG(compania, ' | ' ORDER BY compania) as empresas_duplicadas
FROM temp_import
GROUP BY email
HAVING COUNT(*) > 1;

-- Crear tabla de duplicados por NOMBRE + EMPRESA
CREATE TEMP TABLE duplicados_nombre_empresa AS
SELECT 
  LOWER(TRIM(nombre)) as nombre_normalizado,
  LOWER(TRIM(compania)) as empresa_normalizada,
  COUNT(*) as veces_repetido,
  STRING_AGG(email, ' | ') as emails_asociados
FROM temp_import
WHERE nombre IS NOT NULL AND compania IS NOT NULL
GROUP BY LOWER(TRIM(nombre)), LOWER(TRIM(compania))
HAVING COUNT(*) > 1;

-- Mantener solo UNA fila por email duplicado (la más completa)
CREATE TEMP TABLE temp_deduplicated AS
SELECT DISTINCT ON (email)
  *,
  -- Priorizar registros más completos
  CASE WHEN telefono IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN ciudad IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN nombre IS NOT NULL THEN 1 ELSE 0 END as completeness_score
FROM temp_import
ORDER BY email, completeness_score DESC, compania;

-- Reemplazar temp_import con versión deduplicada
DROP TABLE temp_import;
ALTER TABLE temp_deduplicated RENAME TO temp_import;

-- 3.6 Validar y limpiar teléfonos
UPDATE temp_import 
SET telefono = REGEXP_REPLACE(telefono, '[^0-9+]', '', 'g')
WHERE telefono IS NOT NULL;

-- Eliminar teléfonos inválidos (muy cortos o muy largos)
UPDATE temp_import 
SET telefono = NULL 
WHERE telefono IS NOT NULL 
  AND (LENGTH(telefono) < 10 OR LENGTH(telefono) > 15);

-- PASO 4: INSERTAR EN MARKETING_CONTACTS CON CLASIFICACIÓN
INSERT INTO marketing_contacts (
  company_name,
  contact_name,
  email,
  phone,
  category,
  tier,
  city,
  assigned_email_sender,
  source,
  notes
)
SELECT 
  COALESCE(compania, 'Sin nombre'),
  nombre,
  LOWER(TRIM(email)),
  telefono,
  tipo,
  -- Clasificación automática de tier
  CASE 
    -- AAA: Empresas grandes, corporativos
    WHEN compania ~* '(S\.A\.|SA DE C\.V\.|Corporativo|Grupo|Holdings|Internacional)'
         OR tamano ~ '(Grande|Very Large|Multinacional)'
         OR tipo ~* '(Tecnología|Fintech|Corporativo|Enterprise)'
    THEN 'AAA'
    
    -- AA: Medianas empresas
    WHEN tamano ~ '(Mediana|Medium|Established)'
         OR tipo ~* '(Manufactura|Servicios Profesionales|Comercio)'
         OR personal::INTEGER > 50
    THEN 'AA'
    
    -- A: PyMEs establecidas
    WHEN tamano ~ '(Pequeña|Small|PyME)'
         OR tipo ~* '(Restaurante|Tienda|Retail|Servicio)'
         OR personal::INTEGER BETWEEN 10 AND 50
    THEN 'A'
    
    -- B: Micro empresas o sin clasificar
    ELSE 'B'
  END,
  
  ciudad,
  
  -- Asignar cuenta de envío según tier
  CASE 
    WHEN compania ~* '(S\.A\.|SA DE C\.V\.|Corporativo|Grupo|Holdings)'
         OR tamano ~ '(Grande|Very Large)'
         OR tipo ~* '(Tecnología|Fintech|Corporativo)'
    THEN 'ventasgeobooker@gmail.com'
    ELSE 'geobookerr@gmail.com'
  END,
  
  'csv_import_2026_01_15',
  
  CONCAT('Puesto: ', COALESCE(puesto, 'N/A'), ' | Tamaño: ', COALESCE(tamano, 'N/A'))
  
FROM temp_import
ON CONFLICT (email) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  contact_name = EXCLUDED.contact_name,
  phone = EXCLUDED.phone,
  updated_at = NOW();

-- PASO 5: Estadísticas de importación
SELECT 
  'Total importados' as metrica,
  COUNT(*) as cantidad
FROM marketing_contacts
WHERE source = 'csv_import_2026_01_15'

UNION ALL

SELECT 
  'Tier ' || tier as metrica,
  COUNT(*) as cantidad
FROM marketing_contacts
WHERE source = 'csv_import_2026_01_15'
GROUP BY tier
ORDER BY tier;

-- PASO 6: Ver distribución por cuenta
SELECT 
  assigned_email_sender as cuenta,
  COUNT(*) as contactos_asignados,
  STRING_AGG(DISTINCT tier, ', ' ORDER BY tier) as tiers
FROM marketing_contacts
WHERE source = 'csv_import_2026_01_15'
GROUP BY assigned_email_sender;

-- PASO 7: Limpiar tabla temporal
DROP TABLE IF EXISTS temp_import;

-- PASO 8: Crear vista rápida para el dashboard
CREATE OR REPLACE VIEW marketing_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM marketing_contacts) as total_contactos,
  (SELECT COUNT(*) FROM marketing_contacts WHERE tier = 'AAA') as tier_aaa,
  (SELECT COUNT(*) FROM marketing_contacts WHERE tier = 'AA') as tier_aa,
  (SELECT COUNT(*) FROM marketing_contacts WHERE tier = 'A') as tier_a,
  (SELECT COUNT(*) FROM marketing_contacts WHERE tier = 'B') as tier_b,
  (SELECT COUNT(*) FROM marketing_contacts WHERE email_status = 'pending') as pendientes_email,
  (SELECT COUNT(*) FROM marketing_contacts WHERE assigned_email_sender = 'ventasgeobooker@gmail.com') as asignados_ventas,
  (SELECT COUNT(*) FROM marketing_contacts WHERE assigned_email_sender = 'geobookerr@gmail.com') as asignados_general;

-- Ver estadísticas
SELECT * FROM marketing_dashboard_stats;
