-- Script para crear tabla de solicitudes de eliminación de cuenta
-- Ejecutar en Supabase SQL Editor

-- Tabla para registrar solicitudes de eliminación
CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON account_deletion_requests(status);

-- RLS
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Política: usuarios pueden insertar su propia solicitud
CREATE POLICY "Users can insert own deletion request" ON account_deletion_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Política: usuarios pueden ver su propia solicitud
CREATE POLICY "Users can view own deletion request" ON account_deletion_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Agregar columna deleted_at a user_profiles si no existe
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON TABLE account_deletion_requests IS 'Solicitudes de eliminación de cuenta - Requerido por Google Play Store';
