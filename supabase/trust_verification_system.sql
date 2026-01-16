-- ==============================================================================
-- SISTEMA DE CONFIANZA Y VERIFICACIÓN DE NEGOCIOS
-- ==============================================================================
-- Versión: 1.0
-- Fecha: Enero 2026
-- Objetivo: Trust signals completo con badges, reviews, trust score, 
--           actualización automática y logo personalizado
-- ==============================================================================

-- ============================================
-- 1. MODIFICAR TABLA BUSINESSES
-- ============================================

-- Verificación y Trust
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    is_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    verified_at TIMESTAMPTZ;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    verification_method TEXT; -- 'email', 'phone', 'document', 'manual'

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    trust_score DECIMAL(5,2) DEFAULT 0;

-- Logo personalizado
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    logo_url TEXT;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    logo_source TEXT; -- 'upload', 'email', 'gravatar', 'clearbit', 'generated'

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    has_custom_logo BOOLEAN DEFAULT FALSE;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    logo_uploaded_at TIMESTAMPTZ;

-- Visualización en mapa
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    marker_style TEXT DEFAULT 'pin' CHECK (marker_style IN ('pin', 'logo_pin', 'logo_circle'));

-- Cover photo
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    cover_photo TEXT;

-- Reviews y ratings
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    total_reviews INTEGER DEFAULT 0;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    average_rating DECIMAL(3,2) DEFAULT 0;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    response_rate DECIMAL(5,2) DEFAULT 0;

-- Completitud del perfil
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    profile_completion DECIMAL(5,2) DEFAULT 0;

-- Sistema de actualización automática
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    last_updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    update_required_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 months');

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    auto_deactivate_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months');

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    update_reminder_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    days_since_update INTEGER;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    update_status TEXT;

-- Comentarios
COMMENT ON COLUMN businesses.trust_score IS 'Score de confianza 0-100 calculado automáticamente';
COMMENT ON COLUMN businesses.days_since_update IS 'Días desde última actualización del negocio';
COMMENT ON COLUMN businesses.update_status IS 'Estado: updated (<90d), outdated (90-180d), inactive (>180d)';


-- ============================================
-- 2. TABLA: BUSINESS REVIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS business_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Rating principal (1-5 estrellas)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    
    -- Reseña detallada
    title TEXT,
    review_text TEXT NOT NULL,
    
    -- Criterios específicos (opcional)
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
    
    -- Evidencia
    photos TEXT[], -- URLs de fotos de la visita
    visit_date DATE,
    
    -- Engagement
    helpful_count INTEGER DEFAULT 0,
    
    -- Verificación
    is_verified BOOLEAN DEFAULT FALSE,
    verification_method TEXT, -- 'receipt', 'geolocation', 'owner_confirm'
    
    -- Moderación
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    moderated_by UUID REFERENCES auth.users(id),
    moderated_at TIMESTAMPTZ,
    
    -- Owner response
    owner_response TEXT,
    responded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Un usuario solo puede dejar una review por negocio
    UNIQUE(business_id, reviewer_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reviews_business ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON business_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON business_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON business_reviews(is_approved) WHERE is_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_recent ON business_reviews(created_at DESC);

-- Comentarios
COMMENT ON TABLE business_reviews IS 'Reseñas y calificaciones de negocios por usuarios';
COMMENT ON COLUMN business_reviews.is_verified IS 'Reseña verificada con comprobante o geolocalización';


-- ============================================
-- 3. TABLA: REVIEW HELPFULNESS
-- ============================================

CREATE TABLE IF NOT EXISTS review_helpfulness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES business_reviews(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_helpfulness_review ON review_helpfulness(review_id);


-- ============================================
-- 4. TABLA: BUSINESS PHOTOS
-- ============================================

CREATE TABLE IF NOT EXISTS business_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    
    photo_url TEXT NOT NULL,
    caption TEXT,
    photo_type TEXT CHECK (photo_type IN ('exterior', 'interior', 'product', 'team', 'certificate', 'menu', 'other')),
    
    -- Verificación
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    
    -- Orden
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_business ON business_photos(business_id);
CREATE INDEX IF NOT EXISTS idx_photos_verified ON business_photos(is_verified) WHERE is_verified = TRUE;


-- ============================================
-- 5. TABLA: BUSINESS ENGAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS business_engagement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    
    engagement_type TEXT NOT NULL CHECK (engagement_type IN ('view', 'save', 'share', 'contact_click', 'website_click', 'whatsapp_click', 'call_click')),
    
    -- Metadata
    source TEXT, -- 'map', 'search', 'profile', 'list'
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_business ON business_engagement(business_id);
CREATE INDEX IF NOT EXISTS idx_engagement_type ON business_engagement(engagement_type);
CREATE INDEX IF NOT EXISTS idx_engagement_recent ON business_engagement(created_at DESC);


-- ============================================
-- 6. TABLA: BUSINESS BADGES
-- ============================================

CREATE TABLE IF NOT EXISTS business_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    
    badge_type TEXT NOT NULL CHECK (badge_type IN ('verified', 'premium', 'popular', 'top_rated', 'photos_verified', 'new', 'professional', 'updated', 'custom_branding')),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Auto-revocado si no cumple criterios
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(business_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_badges_business ON business_badges(business_id);
CREATE INDEX IF NOT EXISTS idx_badges_active ON business_badges(is_active) WHERE is_active = TRUE;


-- ============================================
-- 7. FUNCIÓN: CALCULAR TRUST SCORE
-- ============================================

CREATE OR REPLACE FUNCTION calculate_trust_score(p_business_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_score DECIMAL := 0;
    v_business RECORD;
    v_photo_count INTEGER;
    v_has_logo BOOLEAN;
    v_days_old INTEGER;
BEGIN
    -- Obtener datos del negocio
    SELECT * INTO v_business
    FROM businesses
    WHERE id = p_business_id;
    
    IF v_business IS NULL THEN
        RETURN 0;
    END IF;
    
    -- 1. Perfil Completo (max 15 pts)
    v_score := v_score + (COALESCE(v_business.profile_completion, 0) * 0.15);
    
    -- 2. Verificado (15 pts)
    IF v_business.is_verified THEN
        v_score := v_score + 15;
    END IF;
    
    -- 3. Premium (10 pts)
    IF v_business.is_premium THEN
        v_score := v_score + 10;
    END IF;
    
    -- 4. Reviews Quantity (max 15 pts)
    v_score := v_score + LEAST(v_business.total_reviews * 0.5, 15);
    
    -- 5. Average Rating (max 15 pts)
    IF v_business.total_reviews > 0 THEN
        v_score := v_score + (COALESCE(v_business.average_rating, 0) * 3);
    END IF;
    
    -- 6. Response Rate (max 10 pts)
    v_score := v_score + (COALESCE(v_business.response_rate, 0) * 0.1);
    
    -- 7. Photos Count (max 5 pts)
    SELECT COUNT(*) INTO v_photo_count
    FROM business_photos
    WHERE business_id = p_business_id;
    v_score := v_score + LEAST(v_photo_count * 0.5, 5);
    
    -- 8. Info Actualizada (15 pts)
    v_days_old := EXTRACT(DAY FROM NOW() - v_business.last_updated_at)::INTEGER;
    IF v_days_old < 90 THEN
        v_score := v_score + 15;
    ELSIF v_days_old < 150 THEN
        -- Penalización progresiva
        v_score := v_score + (15 * (150 - v_days_old) / 60);
    END IF;
    
    -- 9. Logo personalizado (bonus 5 pts)
    IF v_business.has_custom_logo THEN
        v_score := v_score + 5;
    END IF;
    
    RETURN LEAST(v_score, 100); -- Cap at 100
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 8. FUNCIÓN: ACTUALIZAR RATINGS AGGREGATE
-- ============================================

CREATE OR REPLACE FUNCTION update_business_ratings()
RETURNS TRIGGER AS $$
DECLARE
    v_business_id UUID;
    v_avg_rating DECIMAL;
    v_total_reviews INTEGER;
BEGIN
    -- Determinar business_id desde NEW o OLD
    v_business_id := COALESCE(NEW.business_id, OLD.business_id);
    
    -- Calcular promedio y total
    SELECT 
        COALESCE(AVG(rating), 0),
        COUNT(*)
    INTO v_avg_rating, v_total_reviews
    FROM business_reviews
    WHERE business_id = v_business_id
    AND is_approved = TRUE;
    
    -- Actualizar negocio
    UPDATE businesses
    SET average_rating = v_avg_rating,
        total_reviews = v_total_reviews,
        trust_score = calculate_trust_score(v_business_id)
    WHERE id = v_business_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para reviews
DROP TRIGGER IF EXISTS trigger_update_ratings_on_insert ON business_reviews;
CREATE TRIGGER trigger_update_ratings_on_insert
    AFTER INSERT ON business_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_business_ratings();

DROP TRIGGER IF EXISTS trigger_update_ratings_on_update ON business_reviews;
CREATE TRIGGER trigger_update_ratings_on_update
    AFTER UPDATE ON business_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_business_ratings();

DROP TRIGGER IF EXISTS trigger_update_ratings_on_delete ON business_reviews;
CREATE TRIGGER trigger_update_ratings_on_delete
    AFTER DELETE ON business_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_business_ratings();


-- ============================================
-- 9. FUNCIÓN: ACTUALIZAR NEGOCIO
-- ============================================

CREATE OR REPLACE FUNCTION update_business_info(p_business_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_new_update_date TIMESTAMPTZ;
BEGIN
    v_new_update_date := NOW() + INTERVAL '3 months';
    
    UPDATE businesses
    SET last_updated_at = NOW(),
        update_required_at = v_new_update_date,
        auto_deactivate_at = NOW() + INTERVAL '6 months',
        update_reminder_sent = FALSE,
        trust_score = calculate_trust_score(p_business_id)
    WHERE id = p_business_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'next_update', v_new_update_date,
        'message', 'Información actualizada exitosamente'
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_business_info TO authenticated;


-- ============================================
-- 10. FUNCIÓN: CHECK NEGOCIOS DESACTUALIZADOS
-- ============================================

CREATE OR REPLACE FUNCTION check_outdated_businesses()
RETURNS TABLE(
    action TEXT,
    business_id UUID,
    business_name TEXT,
    owner_email TEXT,
    days_old INTEGER
) AS $$
BEGIN
    -- Negocios que necesitan recordatorio (60 días)
    RETURN QUERY
    SELECT 
        'reminder_60d'::TEXT,
        b.id,
        b.name,
        up.full_name as owner_email,
        b.days_since_update
    FROM businesses b
    LEFT JOIN user_profiles up ON up.id = b.owner_id
    WHERE b.days_since_update >= 60 
    AND b.days_since_update < 61
    AND b.update_reminder_sent = FALSE
    AND b.is_active = TRUE;
    
    -- Marcar recordatorio como enviado
    UPDATE businesses
    SET update_reminder_sent = TRUE
    WHERE days_since_update >= 60
    AND update_reminder_sent = FALSE;
    
    -- Negocios que necesitan badge desactualizado (90 días)
    RETURN QUERY
    SELECT 
        'mark_outdated'::TEXT,
        b.id,
        b.name,
        up.full_name,
        b.days_since_update
    FROM businesses b
    LEFT JOIN user_profiles up ON up.id = b.owner_id
    WHERE b.days_since_update >= 90
    AND b.is_active = TRUE;
    
    -- Negocios a punto de desactivarse (150 días - última advertencia)
    RETURN QUERY
    SELECT 
        'final_warning'::TEXT,
        b.id,
        b.name,
        up.full_name,
        b.days_since_update
    FROM businesses b
    LEFT JOIN user_profiles up ON up.id = b.owner_id
    WHERE b.days_since_update >= 150
    AND b.days_since_update < 151
    AND b.is_active = TRUE;
    
    -- Negocios a desactivar (180 días)
    RETURN QUERY
    SELECT 
        'deactivate'::TEXT,
        b.id,
        b.name,
        up.full_name,
        b.days_since_update
    FROM businesses b
    LEFT JOIN user_profiles up ON up.id = b.owner_id
    WHERE b.days_since_update >= 180
    AND b.is_active = TRUE;
    
    -- Ejecutar desactivación
    UPDATE businesses
    SET is_active = FALSE,
        deactivated_reason = 'No actualizado en 6 meses'
    WHERE days_since_update >= 180
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 11. FUNCIÓN: OTORGAR BADGES AUTOMÁTICOS
-- ============================================

CREATE OR REPLACE FUNCTION auto_assign_badges(p_business_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_business RECORD;
    v_badges_granted INTEGER := 0;
    v_photo_count INTEGER;
BEGIN
    SELECT * INTO v_business
    FROM businesses
    WHERE id = p_business_id;
    
    IF v_business IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Badge: Verificado
    IF v_business.is_verified THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'verified')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE;
        v_badges_granted := v_badges_granted + 1;
    END IF;
    
    -- Badge: Premium
    IF v_business.is_premium THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'premium')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE;
        v_badges_granted := v_badges_granted + 1;
    END IF;
    
    -- Badge: Popular (>50 reviews + rating >4.5)
    IF v_business.total_reviews >= 50 AND v_business.average_rating >= 4.5 THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'popular')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE;
        v_badges_granted := v_badges_granted + 1;
    END IF;
    
    -- Badge: Top Rated (rating 5.0 + >20 reviews)
    IF v_business.total_reviews >= 20 AND v_business.average_rating >= 4.95 THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'top_rated')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE;
        v_badges_granted := v_badges_granted + 1;
    END IF;
    
    -- Badge: Fotos Verificadas
    SELECT COUNT(*) INTO v_photo_count
    FROM business_photos
    WHERE business_id = p_business_id
    AND is_verified = TRUE;
    
    IF v_photo_count  >= 3 THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'photos_verified')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE;
        v_badges_granted := v_badges_granted + 1;
    END IF;
    
    -- Badge: Nuevo (<30 días)
    IF EXTRACT(DAY FROM NOW() - v_business.created_at) < 30 THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'new')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE, expires_at = v_business.created_at + INTERVAL '30 days';
        v_badges_granted := v_badges_granted + 1;
    END IF;
    
    -- Badge: Profesional (perfil 100% completo)
    IF v_business.profile_completion >= 100 THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'professional')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE;
        v_badges_granted := v_badges_granted + 1;
    END IF;
    
    -- Badge: Actualizado (<90 días)
    IF v_business.days_since_update < 90 THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'updated')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE;
        v_badges_granted := v_badges_granted + 1;
    ELSE
        -- Revocar badge si está desactualizado
        UPDATE business_badges
        SET is_active = FALSE
        WHERE business_id = p_business_id
        AND badge_type = 'updated';
    END IF;
    
    -- Badge: Logo personalizado
    IF v_business.has_custom_logo THEN
        INSERT INTO business_badges (business_id, badge_type)
        VALUES (p_business_id, 'custom_branding')
        ON CONFLICT (business_id, badge_type) DO UPDATE
        SET is_active = TRUE;
        v_badges_granted := v_badges_granted + 1;
    END IF;
    
    RETURN v_badges_granted;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 12. RLS POLICIES
-- ============================================

-- Reviews: Usuarios pueden ver approved reviews
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
ON business_reviews FOR SELECT
USING (is_approved = TRUE);

CREATE POLICY "Users can create reviews"
ON business_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update own reviews"
ON business_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id);

-- Helpfulness: Usuarios autenticados pueden votar
ALTER TABLE review_helpfulness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can vote on reviews"
ON review_helpfulness FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Photos: Todos ven, owners suben
ALTER TABLE business_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view photos"
ON business_photos FOR SELECT
USING (TRUE);

CREATE POLICY "Owners can upload photos"
ON business_photos FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE id = business_photos.business_id
        AND owner_id = auth.uid()
    )
);

-- Engagement: Solo inserts, no reads
ALTER TABLE business_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log engagement"
ON business_engagement FOR INSERT
WITH CHECK (TRUE);

-- Badges: Read-only para todos
ALTER TABLE business_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
ON business_badges FOR SELECT
USING (is_active = TRUE);


-- ============================================
-- 13. VISTAS ÚTILES
-- ============================================

-- Vista: Negocios con métricas completas
CREATE OR REPLACE VIEW businesses_with_trust AS
SELECT 
    b.*,
    COALESCE(
        ARRAY_AGG(DISTINCT bb.badge_type) FILTER (WHERE bb.is_active = TRUE),
        ARRAY[]::TEXT[]
    ) as active_badges,
    COUNT(DISTINCT bp.id) as photo_count,
    COUNT(DISTINCT be.id) FILTER (WHERE be.engagement_type = 'view' AND be.created_at >= NOW() - INTERVAL '30 days') as views_last_30d,
    COUNT(DISTINCT be.id) FILTER (WHERE be.engagement_type = 'save') as total_saves
FROM businesses b
LEFT JOIN business_badges bb ON bb.business_id = b.id AND bb.is_active = TRUE
LEFT JOIN business_photos bp ON bp.business_id = b.id
LEFT JOIN business_engagement be ON be.business_id = b.id
GROUP BY b.id;

-- Vista: Top reviews por negocio
CREATE OR REPLACE VIEW top_business_reviews AS
SELECT 
    br.*,
    up.full_name as reviewer_name
FROM business_reviews br
JOIN user_profiles up ON up.id = br.reviewer_id
WHERE br.is_approved = TRUE
ORDER BY br.helpful_count DESC, br.created_at DESC;


-- ============================================
-- RESUMEN
-- ============================================

-- TABLAS NUEVAS:
-- 1. business_reviews - Reseñas y ratings
-- 2. review_helpfulness - Votos útiles
-- 3. business_photos - Galería de fotos
-- 4. business_engagement - Tracking de engagement
-- 5. business_badges - Badges ganados

-- FUNCIONES:
-- 1. calculate_trust_score() - Calcular score automático
-- 2. update_business_ratings() - Actualizar aggregate de reviews
-- 3. update_business_info() - Marcar como actualizado
-- 4. check_outdated_businesses() - Verificar desactualizados
-- 5. auto_assign_badges() - Otorgar badges automáticos

-- MODIFICACIONES A BUSINESSES:
-- - Campos de verificación y trust
-- - Logo personalizado
-- - Sistema de actualización automática
-- - Métricas de reviews

-- NEXT STEPS:
-- 1. Ejecutar este SQL en Supabase
-- 2. Crear servicios JS
-- 3. Crear componentes React
-- 4. Integrar en mapa y perfiles
