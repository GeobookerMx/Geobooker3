-- Trigger para actualizar days_since_update y update_status automáticamente
-- Agregar al final del trust_verification_system.sql

CREATE OR REPLACE FUNCTION update_business_freshness()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular días desde última actualización
    NEW.days_since_update := EXTRACT(DAY FROM NOW() - NEW.last_updated_at)::INTEGER;
    
    -- Calcular status
    IF NEW.days_since_update < 90 THEN
        NEW.update_status := 'updated';
    ELSIF NEW.days_since_update < 180 THEN
        NEW.update_status := 'outdated';
    ELSE
        NEW.update_status := 'inactive';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en INSERT y UPDATE
DROP TRIGGER IF EXISTS trigger_update_freshness ON businesses;
CREATE TRIGGER trigger_update_freshness
    BEFORE INSERT OR UPDATE OF last_updated_at ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_business_freshness();

-- Ejecutar una vez para actualizar todos los registros existentes
UPDATE businesses
SET days_since_update = EXTRACT(DAY FROM NOW() - last_updated_at)::INTEGER,
    update_status = CASE 
        WHEN EXTRACT(DAY FROM NOW() - last_updated_at) < 90 THEN 'updated'
        WHEN EXTRACT(DAY FROM NOW() - last_updated_at) < 180 THEN 'outdated'
        ELSE 'inactive'
    END
WHERE last_updated_at IS NOT NULL;

COMMENT ON FUNCTION update_business_freshness IS 'Actualiza automáticamente days_since_update y update_status';
