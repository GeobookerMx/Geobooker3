-- ============================================================
-- FIX v2: Limpiar huérfanos y crear FK de forma segura
-- Error anterior: registros en email_queue con contact_id 
-- que no existen en marketing_contacts
--
-- INSTRUCCIONES: Ejecutar en Supabase SQL Editor
-- ============================================================

-- PASO 1: Ver cuántos registros huérfanos hay (informativo)
SELECT COUNT(*) AS huerfanos_a_eliminar
FROM email_queue eq
WHERE eq.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM marketing_contacts mc WHERE mc.id = eq.contact_id
  );

-- PASO 2: Eliminar los registros huérfanos de email_queue
-- (son contactos que ya no existen y no se pueden enviar de todas formas)
DELETE FROM email_queue
WHERE contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM marketing_contacts mc WHERE mc.id = email_queue.contact_id
  );

-- PASO 3: También limpiar los registros con contact_id NULL
DELETE FROM email_queue WHERE contact_id IS NULL;

-- PASO 4: Ahora sí crear la FK de forma segura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'email_queue'
        AND constraint_name = 'email_queue_contact_id_fkey'
    ) THEN
        ALTER TABLE email_queue
            ADD CONSTRAINT email_queue_contact_id_fkey
            FOREIGN KEY (contact_id)
            REFERENCES marketing_contacts(id)
            ON DELETE CASCADE;
        RAISE NOTICE '✅ FK creada correctamente';
    ELSE
        RAISE NOTICE '✅ FK ya existía';
    END IF;
END $$;

-- PASO 5: Recargar el schema cache de Supabase (resuelve el error de cache)
NOTIFY pgrst, 'reload schema';

-- PASO 6: Verificación final — debe mostrar la FK
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'email_queue';
