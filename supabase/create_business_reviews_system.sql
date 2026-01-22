-- ================================================================
-- SCHEMA: Sistema de Reseñas de Negocios
-- Crear tabla business_reviews + reseñas de ejemplo
-- ================================================================

-- 1. Crear extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Eliminar tabla existente si tiene problemas de constraint
DROP TABLE IF EXISTS business_reviews CASCADE;

-- 3. Crear tabla de reseñas (con reviewer_id NULLABLE)
CREATE TABLE business_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL,
    reviewer_id UUID, -- NULLABLE para permitir reseñas del sistema/anónimas
    
    -- Calificaciones
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
    
    -- Contenido
    title TEXT,
    review_text TEXT NOT NULL,
    photos TEXT[], -- URLs de fotos
    
    -- Metadatos
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_business_reviews_business ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_rating ON business_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_business_reviews_approved ON business_reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_business_reviews_created ON business_reviews(created_at DESC);

-- 4. Políticas RLS (Row Level Security)
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;

-- Lectura pública de reseñas aprobadas
DROP POLICY IF EXISTS "Public can view approved reviews" ON business_reviews;
CREATE POLICY "Public can view approved reviews"
    ON business_reviews FOR SELECT
    USING (is_approved = true);

-- Solo usuarios autenticados pueden crear reseñas
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON business_reviews;
CREATE POLICY "Authenticated users can create reviews"
    ON business_reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

-- ================================================================
-- RESEÑAS DE EJEMPLO PARA LOS 4 NEGOCIOS
-- ================================================================

-- Obtener IDs de negocios existentes
DO $$
DECLARE
    business_1 UUID;
    business_2 UUID;
    business_3 UUID;
    business_4 UUID;
BEGIN
    -- Seleccionar los primeros 4 negocios
    SELECT id INTO business_1 FROM businesses ORDER BY created_at LIMIT 1 OFFSET 0;
    SELECT id INTO business_2 FROM businesses ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO business_3 FROM businesses ORDER BY created_at LIMIT 1 OFFSET 2;
    SELECT id INTO business_4 FROM businesses ORDER BY created_at LIMIT 1 OFFSET 3;

    -- NEGOCIO 1: 5 reseñas (4.8★ promedio)
    INSERT INTO business_reviews (business_id, rating, service_rating, quality_rating, price_rating, title, review_text, is_approved, helpful_count, created_at) VALUES
    (business_1, 5, 5, 5, 5, 'Excelente servicio', '¡Muy recomendado! La atención es de primera y la calidad excepcional. Sin duda volveré.', true, 12, NOW() - INTERVAL '45 days'),
    (business_1, 5, 5, 5, 4, 'Muy buena experiencia', 'Todo perfecto, desde la atención hasta el producto final. Totalmente satisfecho con el servicio.', true, 8, NOW() - INTERVAL '30 days'),
    (business_1, 5, 4, 5, 5, 'Recomendado 100%', 'Excelente relación calidad-precio. El personal es muy amable y profesional.', true, 15, NOW() - INTERVAL '20 days'),
    (business_1, 4, 4, 4, 4, 'Muy bien', 'Buena experiencia en general. Cumplieron con lo prometido y en tiempo.', true, 6, NOW() - INTERVAL '10 days'),
    (business_1, 5, 5, 5, 5, 'Increíble', 'Superó mis expectativas. Definitivamente es mi lugar favorito ahora. ¡5 estrellas!', true, 20, NOW() - INTERVAL '3 days');

    -- NEGOCIO 2: 4 reseñas (4.75★ promedio)
    INSERT INTO business_reviews (business_id, rating, service_rating, quality_rating, price_rating, title, review_text, is_approved, helpful_count, created_at) VALUES
    (business_2, 5, 5, 5, 5, 'Perfecto', 'No tengo quejas, todo estuvo excelente. El equipo es muy profesional y atento.', true, 9, NOW() - INTERVAL '50 days'),
    (business_2, 5, 5, 4, 5, 'Muy satisfecho', 'Excelente atención y calidad. Los recomiendo ampliamente.', true, 11, NOW() - INTERVAL '25 days'),
    (business_2, 4, 4, 5, 4, 'Buena opción', 'Buen servicio y precios justos. Volvería sin dudarlo.', true, 5, NOW() - INTERVAL '15 days'),
    (business_2, 5, 5, 5, 5, 'Lo mejor de la zona', 'Sin duda el mejor lugar para este servicio. Altamente recomendado.', true, 18, NOW() - INTERVAL '7 days');

    -- NEGOCIO 3: 6 reseñas (4.83★ promedio)
    INSERT INTO business_reviews (business_id, rating, service_rating, quality_rating, price_rating, title, review_text, is_approved, helpful_count, created_at) VALUES
    (business_3, 5, 5, 5, 5, 'Excelente en todo', 'Superó todas mis expectativas. Servicio rápido, eficiente y de calidad.', true, 14, NOW() - INTERVAL '60 days'),
    (business_3, 5, 5, 5, 4, 'Muy recomendable', 'Gran servicio y atención personalizada. Los precios son muy competitivos.', true, 10, NOW() - INTERVAL '40 days'),
    (business_3, 5, 4, 5, 5, 'Genial', 'Todo perfecto, volveré seguro. El personal es muy amable.', true, 7, NOW() - INTERVAL '28 days'),
    (business_3, 4, 5, 4, 4, 'Muy bien', 'Buena experiencia, cumplen lo que prometen.', true, 4, NOW() - INTERVAL '18 days'),
    (business_3, 5, 5, 5, 5, 'Lo mejor', '¡Increíble! Es exactamente lo que buscaba. 100% recomendado.', true, 22, NOW() - INTERVAL '9 days'),
    (business_3, 5, 5, 5, 5, 'Perfecto', 'No cambiaría nada. Excelente servicio de principio a fin.', true, 16, NOW() - INTERVAL '2 days');

    -- NEGOCIO 4: 4 reseñas (4.5★ promedio)
    INSERT INTO business_reviews (business_id, rating, service_rating, quality_rating, price_rating, title, review_text, is_approved, helpful_count, created_at) VALUES
    (business_4, 5, 5, 5, 4, 'Excelente', 'Muy buen servicio y atención. Lo recomiendo totalmente.', true, 8, NOW() - INTERVAL '35 days'),
    (business_4, 4, 4, 4, 4, 'Buena experiencia', 'Todo bien, cumplen con lo prometido.', true, 5, NOW() - INTERVAL '22 days'),
    (business_4, 5, 5, 4, 5, 'Recomendado', 'Excelente opción en la zona. Volveré pronto.', true, 12, NOW() - INTERVAL '14 days'),
    (business_4, 4, 4, 5, 4, 'Satisfecho', 'Buen servicio, precios razonables. Sin quejas.', true, 6, NOW() - INTERVAL '5 days');

END $$;

-- ================================================================
-- ACTUALIZAR PROMEDIOS EN TABLA BUSINESSES
-- ================================================================

-- Agregar columnas de rating si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='average_rating') THEN
        ALTER TABLE businesses ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='review_count') THEN
        ALTER TABLE businesses ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='last_verified') THEN
        ALTER TABLE businesses ADD COLUMN last_verified TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Calcular y actualizar los promedios
UPDATE businesses b
SET 
    average_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM business_reviews
        WHERE business_id = b.id AND is_approved = true
    ),
    review_count = (
        SELECT COUNT(*)
        FROM business_reviews
        WHERE business_id = b.id AND is_approved = true
    ),
    last_verified = NOW()
WHERE id IN (SELECT DISTINCT business_id FROM business_reviews);

-- ================================================================
-- FUNCIÓN: Actualizar promedio automáticamente
-- ================================================================

CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE businesses
    SET 
        average_rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM business_reviews
            WHERE business_id = NEW.business_id AND is_approved = true
        ),
        review_count = (
            SELECT COUNT(*)
            FROM business_reviews
            WHERE business_id = NEW.business_id AND is_approved = true
        ),
        last_verified = NOW()
    WHERE id = NEW.business_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente
DROP TRIGGER IF EXISTS trigger_update_business_rating ON business_reviews;
CREATE TRIGGER trigger_update_business_rating
    AFTER INSERT OR UPDATE OF is_approved, rating ON business_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_business_rating();

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

-- Ver resumen de reseñas por negocio
SELECT 
    b.name as negocio,
    b.average_rating as promedio,
    b.review_count as total_reseñas,
    b.last_verified as verificado
FROM businesses b
WHERE b.review_count > 0
ORDER BY b.average_rating DESC;

-- ✅ Listo! Ahora los negocios tienen reseñas y aparecerán con estrellas
