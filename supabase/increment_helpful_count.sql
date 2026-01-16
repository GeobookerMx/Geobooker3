-- Función SQL faltante para incrementar votos útiles
-- Agregar a trust_verification_system.sql o ejecutar aparte

CREATE OR REPLACE FUNCTION increment_helpful_count(p_review_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE business_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION increment_helpful_count TO authenticated;

COMMENT ON FUNCTION increment_helpful_count IS 'Incrementa contador de votos útiles en una review';
