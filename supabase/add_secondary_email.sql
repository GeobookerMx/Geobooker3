-- =========================================
-- Agregar campo secondary_email a crm_contacts
-- Ejecutar en Supabase SQL Editor
-- =========================================

-- Agregar columna para email corporativo/secundario
ALTER TABLE crm_contacts 
ADD COLUMN IF NOT EXISTS secondary_email TEXT;

-- Índice para buscar por email secundario
CREATE INDEX IF NOT EXISTS idx_crm_contacts_secondary_email 
ON crm_contacts(secondary_email);

-- Comentario descriptivo
COMMENT ON COLUMN crm_contacts.secondary_email IS 'Email corporativo o secundario del contacto';
