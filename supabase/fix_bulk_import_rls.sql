-- Arreglar RLS Policy para permitir Bulk Import
-- Versión simplificada sin dependencia de admin_users

-- Primero, eliminar la policy si ya existe
DROP POLICY IF EXISTS "Admins can bulk import businesses" ON businesses;

-- Crear política simplificada para bulk import
CREATE POLICY "Allow bulk import and owner insert"
ON businesses FOR INSERT
TO authenticated
WITH CHECK (
    -- Permitir si el usuario es el owner del negocio
    (auth.uid() = owner_id)
    OR
    -- O si es bulk import (sin owner asignado aún)
    (owner_id IS NULL)
);

-- Comentario
COMMENT ON POLICY "Allow bulk import and owner insert" ON businesses IS 
'Permite a usuarios autenticados crear sus negocios o hacer bulk import sin owner';
