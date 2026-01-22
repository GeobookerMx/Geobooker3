-- ================================================================
-- FIX MANUAL: Registrar emails enviados que no se guardaron
-- Ejecutar SOLO si los emails se enviaron pero no aparecen en campaign_history
-- Fecha: 2026-01-22
-- ================================================================

-- PASO 1: Ver cuántos emails se enviaron HOY según Resend
-- (Debes verificar en Resend Dashboard cuántos se enviaron realmente)

-- PASO 2: Ver si process-email-queue actualizó marketing_contacts
SELECT 
    COUNT(*) as contactos_actualizados_hoy,
    MIN(last_email_sent) as primer_envio,
    MAX(last_email_sent) as ultimo_envio
FROM marketing_contacts
WHERE DATE(last_email_sent AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE;

-- PASO 3: Si el COUNT > 0, entonces SÍ se actualizaron los contactos
-- pero NO se guardó en campaign_history

-- PASO 4 FIX: Insertar registros faltantes en campaign_history
-- basándose en marketing_contacts que se actualizaron HOY

INSERT INTO campaign_history (
    contact_id,
    campaign_type,
    sent_at
)
SELECT 
    id as contact_id,
    'email' as campaign_type,
    last_email_sent as sent_at
FROM marketing_contacts
WHERE DATE(last_email_sent AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE
AND id NOT IN (
    SELECT contact_id 
    FROM campaign_history 
    WHERE campaign_type = 'email' 
    AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE
);

-- PASO 5: Verificar que se insertaron
SELECT COUNT(*) as emails_registrados_hoy
FROM campaign_history
WHERE campaign_type = 'email'
AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE;

-- PASO 6: Ver detalles de los registros
SELECT 
    ch.sent_at,
    mc.email,
    mc.company_name,
    mc.tier
FROM campaign_history ch
JOIN marketing_contacts mc ON ch.contact_id = mc.id
WHERE ch.campaign_type = 'email'
AND DATE(ch.sent_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE
ORDER BY ch.sent_at DESC
LIMIT 20;

-- ✅ Después de ejecutar esto, el CRM debería mostrar el contador correcto
