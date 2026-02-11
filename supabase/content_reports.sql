-- supabase/content_reports.sql
-- Tabla genérica para reportes de contenido (Reseñas, Comentarios, Posts)
-- Soporta el flujo de moderación de UGC para cumplimiento con Apple App Store

CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- 'review', 'comment', 'post', etc.
    content_id UUID NOT NULL,   -- ID del item reportado
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,       -- 'spam', 'offensive', 'inappropriate', 'misleading', 'other'
    details TEXT,               -- Descripción del problema
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    
    -- Resolución
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_content_reports_type_id ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created ON content_reports(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden crear reportes
CREATE POLICY "Users can create content reports"
    ON content_reports FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Solo admins pueden ver y gestionar reportes
CREATE POLICY "Admins can manage all content reports"
    ON content_reports FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid()
        )
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_content_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_content_reports_updated
    BEFORE UPDATE ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_content_report_timestamp();

COMMENT ON TABLE content_reports IS 'Reportes de contenido generado por usuarios (reseñas, comentarios, etc)';
