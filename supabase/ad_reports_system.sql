-- Sistema de Reportes de Anuncios
-- Permite a usuarios reportar anuncios inapropiados durante su pauta

-- Tabla de reportes de anuncios
CREATE TABLE IF NOT EXISTS ad_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_email TEXT,
    reason TEXT NOT NULL CHECK (reason IN (
        'inappropriate_content',   -- Contenido inapropiado
        'misleading',              -- Publicidad engañosa
        'offensive',               -- Contenido ofensivo
        'spam',                    -- Spam o repetitivo
        'illegal_product',         -- Producto/servicio ilegal
        'wrong_targeting',         -- Aparece en ubicación incorrecta
        'competitor_attack',       -- Ataque de competidor
        'other'                    -- Otro
    )),
    details TEXT,                  -- Detalles adicionales del reporte
    screenshot_url TEXT,           -- URL de captura de pantalla (opcional)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    -- Resolución
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    action_taken TEXT CHECK (action_taken IN (
        'no_action',               -- Sin acción (reporte inválido)
        'warning_sent',            -- Advertencia enviada al anunciante
        'ad_paused',               -- Anuncio pausado
        'ad_rejected',             -- Anuncio rechazado definitivamente
        'advertiser_banned'        -- Anunciante baneado
    )),
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Contexto del reporte
    user_location JSONB,           -- Ubicación del usuario al ver el anuncio
    page_url TEXT,                 -- URL donde se mostró el anuncio
    ad_space_type TEXT             -- Tipo de espacio donde se mostró
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ad_reports_campaign ON ad_reports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_reports_status ON ad_reports(status);
CREATE INDEX IF NOT EXISTS idx_ad_reports_created ON ad_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_reports_priority ON ad_reports(priority);

-- RLS Policies
ALTER TABLE ad_reports ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede crear un reporte
CREATE POLICY "Users can create ad reports"
    ON ad_reports FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Solo el reporter puede ver sus propios reportes
CREATE POLICY "Users can view own reports"
    ON ad_reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

-- Admins pueden ver y gestionar todos los reportes
CREATE POLICY "Admins can manage all ad reports"
    ON ad_reports FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid()
        )
    );

-- Usuarios anónimos pueden crear reportes (con email)
CREATE POLICY "Anonymous can create ad reports"
    ON ad_reports FOR INSERT
    TO anon
    WITH CHECK (reporter_email IS NOT NULL);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_ad_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ad_reports_updated
    BEFORE UPDATE ON ad_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_report_timestamp();

-- Comentarios
COMMENT ON TABLE ad_reports IS 'Reportes de anuncios inapropiados enviados por usuarios';
COMMENT ON COLUMN ad_reports.reason IS 'Motivo del reporte: inappropriate_content, misleading, offensive, spam, illegal_product, wrong_targeting, competitor_attack, other';
COMMENT ON COLUMN ad_reports.action_taken IS 'Acción tomada por admin: no_action, warning_sent, ad_paused, ad_rejected, advertiser_banned';
