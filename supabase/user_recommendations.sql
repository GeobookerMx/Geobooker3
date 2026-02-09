-- =====================================================
-- SISTEMA: Los Usuarios Recomiendan
-- Tabla para almacenar recomendaciones de usuarios
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. CREAR TABLA DE RECOMENDACIONES
CREATE TABLE IF NOT EXISTS user_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Información del Negocio Recomendado
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    address TEXT,
    
    -- Ubicación Geográfica
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Evaluación del Usuario
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    pros TEXT, -- ¿Qué te gustó?
    cons TEXT, -- ¿Qué NO te gustó?
    
    -- Multimedia
    photo_url TEXT, -- URL de foto (opcional)
    
    -- Estado de Moderación
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT, -- Razón si fue rechazado
    
    -- Metadata de Aprobación
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ÍNDICES PARA BÚSQUEDA RÁPIDA
CREATE INDEX idx_user_recommendations_user ON user_recommendations(user_id);
CREATE INDEX idx_user_recommendations_status ON user_recommendations(status);
CREATE INDEX idx_user_recommendations_location ON user_recommendations(latitude, longitude);
CREATE INDEX idx_user_recommendations_approved ON user_recommendations(status) WHERE status = 'approved';

-- 3. FUNCIÓN PARA CONTAR RECOMENDACIONES DEL MES ACTUAL
CREATE OR REPLACE FUNCTION count_user_recommendations_this_month(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO count_result
    FROM user_recommendations
    WHERE user_id = p_user_id
    AND DATE_TRUNC('month', created_at AT TIME ZONE 'America/Mexico_City') = 
        DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Mexico_City');
    
    RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN PARA OBTENER LÍMITE DE RECOMENDACIONES POR USUARIO
-- Base: 10/mes + 5 por cada referido exitoso
CREATE OR REPLACE FUNCTION get_user_recommendation_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    base_limit INTEGER := 10;
    referral_bonus INTEGER := 0;
    referral_count INTEGER;
BEGIN
    -- Contar referidos exitosos del usuario
    SELECT COALESCE(
        (SELECT COUNT(*) FROM referrals 
         WHERE referrer_id = p_user_id 
         AND status = 'completed'),
        0
    )::INTEGER INTO referral_count;
    
    -- Cada referido = +5 recomendaciones
    referral_bonus := referral_count * 5;
    
    RETURN base_limit + referral_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN PARA VERIFICAR SI PUEDE RECOMENDAR
CREATE OR REPLACE FUNCTION can_user_recommend(p_user_id UUID)
RETURNS TABLE (
    can_recommend BOOLEAN,
    current_count INTEGER,
    monthly_limit INTEGER,
    remaining INTEGER
) AS $$
DECLARE
    v_current INTEGER;
    v_limit INTEGER;
BEGIN
    v_current := count_user_recommendations_this_month(p_user_id);
    v_limit := get_user_recommendation_limit(p_user_id);
    
    RETURN QUERY SELECT 
        (v_current < v_limit) AS can_recommend,
        v_current AS current_count,
        v_limit AS monthly_limit,
        GREATEST(0, v_limit - v_current) AS remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver recomendaciones APROBADAS
CREATE POLICY "Public can view approved recommendations"
    ON user_recommendations FOR SELECT
    USING (status = 'approved');

-- Política: El usuario puede ver sus propias recomendaciones (cualquier status)
CREATE POLICY "Users can view own recommendations"
    ON user_recommendations FOR SELECT
    USING (auth.uid() = user_id);

-- Política: Usuarios autenticados pueden crear recomendaciones
CREATE POLICY "Authenticated users can create recommendations"
    ON user_recommendations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: El usuario puede actualizar sus propias recomendaciones (solo si están pendientes)
CREATE POLICY "Users can update own pending recommendations"
    ON user_recommendations FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending');

-- Política: El usuario puede eliminar sus propias recomendaciones (solo si están pendientes)
CREATE POLICY "Users can delete own pending recommendations"
    ON user_recommendations FOR DELETE
    USING (auth.uid() = user_id AND status = 'pending');

-- 7. TRIGGER PARA updated_at
CREATE OR REPLACE FUNCTION update_recommendation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_recommendations_updated_at
    BEFORE UPDATE ON user_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_recommendation_updated_at();

-- 8. COMENTARIOS
COMMENT ON TABLE user_recommendations IS 'Recomendaciones de negocios hechas por usuarios de Geobooker';
COMMENT ON COLUMN user_recommendations.status IS 'Estado de moderación: pending, approved, rejected';
COMMENT ON COLUMN user_recommendations.rating IS 'Calificación del 1 al 5 estrellas';
COMMENT ON COLUMN user_recommendations.pros IS 'Aspectos positivos mencionados por el usuario';
COMMENT ON COLUMN user_recommendations.cons IS 'Aspectos negativos mencionados por el usuario';

-- 9. VERIFICACIÓN
SELECT 'user_recommendations table created' AS status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_recommendations'
ORDER BY ordinal_position;
