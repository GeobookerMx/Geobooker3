-- Script SQL para importar CSV completo por lotes
-- Base de datos: Supabase PostgreSQL
-- Ejecutar en: pgAdmin o Supabase SQL Editor

-- ============================================
-- IMPORTACIÓN MASIVA POR LOTES
-- ============================================

-- INSTRUCCIONES:
-- 1. Primero ejecuta: scripts/clean_csv_and_import.ps1 (PowerShell)
-- 2. Esto creará: data/cleaned_contacts.csv
-- 3. Luego ejecuta este script por secciones

-- ============================================
-- PASO 1: Crear tabla temporal
-- ============================================

DROP TABLE IF EXISTS temp_import_contacts CASCADE;

CREATE TABLE temp_import_contacts (
    -- Ajustar columnas según el CSV real
    nombre_empresa TEXT,
    nombre_contacto TEXT,
    email TEXT,
    telefono TEXT,
    ciudad TEXT,
    estado TEXT,
    codigo_postal TEXT,
    giro TEXT,
    tier TEXT,
    notas TEXT
);

-- ============================================
-- PASO 2: Importar CSV a tabla temporal
-- ============================================

-- OPCIÓN A: Usando Supabase Dashboard
-- 1. Ve a Table Editor → temp_import_contacts
-- 2. Clic en "Import data via spreadsheet"
-- 3. Selecciona: data/cleaned_contacts.csv
-- 4. Supabase importará automáticamente

-- OPCIÓN B: Usando psqlcmd (si tienes acceso directo)
-- \copy temp_import_contacts FROM 'C:/Users/juanpablo/Geobooker3/data/cleaned_contacts.csv' DELIMITER ',' CSV HEADER;

-- NOTA: Después de importar, continúa con PASO 3

-- ============================================
-- PASO 3: Ver muestra de datos importados
-- ============================================

SELECT 
    COUNT(*) as total_importados,
    COUNT(DISTINCT email) as emails_unicos,
    COUNT(DISTINCT telefono) as telefonos_unicos
FROM temp_import_contacts;

-- Ver primeros 10 registros
SELECT * FROM temp_import_contacts LIMIT 10;

-- ============================================
-- PASO 4: Validar y limpiar datos
-- ============================================

-- Limpiar emails
UPDATE temp_import_contacts
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

-- Limpiar teléfonos (dejar solo dígitos)
UPDATE temp_import_contacts
SET telefono = REGEXP_REPLACE(telefono, '[^0-9]', '', 'g')
WHERE telefono IS NOT NULL;

-- Normalizar tier
UPDATE temp_import_contacts
SET tier = UPPER(TRIM(tier))
WHERE tier IS NOT NULL;

-- Validar emails (marcar inválidos como NULL)
UPDATE temp_import_contacts
SET email = NULL
WHERE email IS NOT NULL 
AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Ver estadísticas post-limpieza
SELECT 
    COUNT(*) as total,
    COUNT(email) as con_email_valido,
    COUNT(telefono) as con_telefono,
    COUNT(CASE WHEN LENGTH(telefono) BETWEEN 10 AND 15 THEN 1 END) as telefonos_validos
FROM temp_import_contacts;

-- ============================================
-- PASO 5: Clasificar por tier automáticamente
-- ============================================

-- Si no tienen tier asignado, clasificar basado en datos disponibles
UPDATE temp_import_contacts
SET tier = CASE
    WHEN email IS NOT NULL AND telefono IS NOT NULL THEN 'A'
    WHEN email IS NOT NULL THEN 'B'
    WHEN telefono IS NOT NULL THEN 'B'
    ELSE 'B'
END
WHERE tier IS NULL OR tier = '';

-- Verificar distribución por tier
SELECT 
    tier,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentaje
FROM temp_import_contacts
GROUP BY tier
ORDER BY tier;

-- ============================================
-- PASO 6: Insertar en marketing_contacts (POR LOTES)
-- ============================================

-- BATCH 1: Primeros 100,000 registros
INSERT INTO marketing_contacts (
    company_name,
    contact_name,
    email,
    phone,
    city,
    state,
    postal_code,
    industry,
    tier,
    notes,
    source,
    is_active
)
SELECT 
    nombre_empresa,
    nombre_contacto,
    email,
    CASE 
        WHEN LENGTH(telefono) BETWEEN 10 AND 15 THEN telefono
        ELSE NULL 
    END as phone,
    ciudad,
    estado,
    codigo_postal,
    giro,
    tier,
    notas,
    'CSV_Import_2026',
    TRUE
FROM temp_import_contacts
WHERE email IS NOT NULL  -- Solo con email válido
LIMIT 100000
ON CONFLICT (email) DO NOTHING;  -- Evitar duplicados

-- Ver progreso
SELECT COUNT(*) as importados_batch_1 FROM marketing_contacts WHERE source = 'CSV_Import_2026';

-- ESPERAR 1 MINUTO antes del siguiente batch para no saturar

-- BATCH 2: Siguientes 100,000
INSERT INTO marketing_contacts (
    company_name,
    contact_name,
    email,
    phone,
    city,
    state,
    postal_code,
    industry,
    tier,
    notes,
    source,
    is_active
)
SELECT 
    nombre_empresa,
    nombre_contacto,
    email,
    CASE 
        WHEN LENGTH(telefono) BETWEEN 10 AND 15 THEN telefono
        ELSE NULL 
    END as phone,
    ciudad,
    estado,
    codigo_postal,
    giro,
    tier,
    notas,
    'CSV_Import_2026',
    TRUE
FROM temp_import_contacts
WHERE email IS NOT NULL
AND email NOT IN (SELECT email FROM marketing_contacts WHERE email IS NOT NULL)
LIMIT 100000
ON CONFLICT (email) DO NOTHING;

-- Ver progreso total
SELECT COUNT(*) as total_importados FROM marketing_contacts WHERE source = 'CSV_Import_2026';

-- ============================================
-- PASO 7: Importar contactos sin email (solo teléfono)
-- ============================================

-- Estos van con email_status = NULL pero con teléfono para WhatsApp
INSERT INTO marketing_contacts (
    company_name,
    contact_name,
    phone,
    city,
    state,
    industry,
    tier,
    source,
    is_active,
    email_status
)
SELECT 
    nombre_empresa,
    nombre_contacto,
    telefono,
    ciudad,
    estado,
    giro,
    COALESCE(tier, 'B'),
    'CSV_Import_2026_Phone_Only',
    TRUE,
    NULL
FROM temp_import_contacts
WHERE (email IS NULL OR email = '')
AND telefono IS NOT NULL
AND LENGTH(telefono) BETWEEN 10 AND 15
LIMIT 50000;  -- Límite razonable para contactos solo con teléfono

-- ============================================
-- PASO 8: Asignar remitentes de email automáticamente
-- ============================================

UPDATE marketing_contacts
SET assigned_email_sender = CASE
    WHEN tier IN ('AAA', 'AA') THEN 'ventasgeobooker@gmail.com'
    WHEN tier IN ('A', 'B') THEN 'geobookerr@gmail.com'
    ELSE 'geobookerr@gmail.com'
END
WHERE source LIKE 'CSV_Import_2026%'
AND email IS NOT NULL;

-- ============================================
-- PASO 9: Verificar importación completa
-- ============================================

-- Estadísticas finales
SELECT 
    'TOTAL CONTACTOS' as metrica,
    COUNT(*) as cantidad
FROM marketing_contacts
WHERE source LIKE 'CSV_Import_2026%'

UNION ALL

SELECT 
    'Con email válido',
    COUNT(*)
FROM marketing_contacts
WHERE source LIKE 'CSV_Import_2026%'
AND email IS NOT NULL

UNION ALL

SELECT 
    'Con teléfono válido',
    COUNT(*)
FROM marketing_contacts
WHERE source LIKE 'CSV_Import_2026%'
AND phone IS NOT NULL

UNION ALL

SELECT 
    'Tier ' || tier,
    COUNT(*)
FROM marketing_contacts
WHERE source LIKE 'CSV_Import_2026%'
GROUP BY tier;

-- Distribución por tier
SELECT 
    tier,
    COUNT(*) as total,
    COUNT(email) as con_email,
    COUNT(phone) as con_telefono,
    assigned_email_sender as remitente_asignado,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentaje
FROM marketing_contacts
WHERE source LIKE 'CSV_Import_2026%'
GROUP BY tier, assigned_email_sender
ORDER BY tier;

-- ============================================
-- PASO 10: Limpiar tabla temporal
-- ============================================

DROP TABLE IF EXISTS temp_import_contacts CASCADE;

-- ============================================
-- RESUMEN FINAL
-- ============================================

/*
CAPACIDAD FINAL:
- Con 1M+ contactos @ 100 emails/día = ~10,000 días
- Upgrade Resend Pro ($20/mes) = 1,666 emails/día = ~600 días
- Con 2 cuentas Gmail API = 1,000 emails/día = ~1,000 días

RECOMENDACIÓN:
1. Importar primero 100k contactos tier AAA/AA (alta prioridad)
2. Validar sistema completamente
3. Luego importar resto gradualmente
4. Considerar múltiples cuentas de envío para escalar
*/

-- Ver contactos listos para enviar HOY
SELECT COUNT(*) as listos_para_enviar
FROM marketing_contacts
WHERE email IS NOT NULL
AND email_status = 'pending'
AND is_active = TRUE;
