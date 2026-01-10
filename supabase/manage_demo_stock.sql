-- ==========================================================
-- GESTIÓN DE STOCK: Desactivar campañas demo cuando hay pagadas
-- Ejecutar este script cuando un cliente pague una campaña
-- ==========================================================

-- Opción 1: Desactivar TODAS las campañas demo (cuando todo está vendido)
UPDATE ad_campaigns 
SET status = 'paused'
WHERE is_demo = true AND status = 'active';

-- Opción 2: Reactivar demos (cuando hay espacios libres de nuevo)
-- UPDATE ad_campaigns 
-- SET status = 'active'
-- WHERE is_demo = true AND status = 'paused';

-- ==========================================================
-- FUNCIÓN AUTOMÁTICA: Verificar stock y manejar demos
-- Uso: SELECT check_and_toggle_demo_campaigns();
-- ==========================================================

CREATE OR REPLACE FUNCTION check_and_toggle_demo_campaigns()
RETURNS TEXT AS $$
DECLARE
    total_slots INTEGER;
    paid_campaigns INTEGER;
    result_msg TEXT;
BEGIN
    -- Contar slots totales disponibles (ejemplo: 10 slots máximos)
    total_slots := 10;
    
    -- Contar campañas de pago activas
    SELECT COUNT(*) INTO paid_campaigns 
    FROM ad_campaigns 
    WHERE status = 'active' AND (is_demo = false OR is_demo IS NULL);
    
    IF paid_campaigns >= total_slots THEN
        -- Stock lleno: desactivar demos
        UPDATE ad_campaigns 
        SET status = 'paused'
        WHERE is_demo = true AND status = 'active';
        result_msg := 'Stock lleno. Demos pausadas. Campañas pagadas: ' || paid_campaigns;
    ELSE
        -- Hay espacio: reactivar demos
        UPDATE ad_campaigns 
        SET status = 'active'
        WHERE is_demo = true AND status = 'paused';
        result_msg := 'Espacio disponible. Demos activas. (' || paid_campaigns || '/' || total_slots || ' slots usados)';
    END IF;
    
    RETURN result_msg;
END;
$$ LANGUAGE plpgsql;

-- Ver estado actual de campañas
SELECT 
    advertiser_name,
    status,
    is_demo,
    ad_level,
    start_date,
    end_date
FROM ad_campaigns
ORDER BY is_demo, status, advertiser_name;
