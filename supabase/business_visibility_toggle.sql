-- =====================================================
-- Toggle Visibilidad de Negocio (Abrir/Cerrar Digital)
-- =====================================================

-- Agregar columna is_visible a businesses (si no existe)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Índice para filtrar negocios visibles
CREATE INDEX IF NOT EXISTS idx_businesses_visible ON businesses(is_visible) WHERE is_visible = true;

-- Comentario
COMMENT ON COLUMN businesses.is_visible IS 'Permite al dueño cerrar temporalmente su negocio en el mapa sin eliminarlo';

-- =====================================================
-- Función para toggle de visibilidad
-- =====================================================
CREATE OR REPLACE FUNCTION toggle_business_visibility(
  p_business_id UUID,
  p_is_visible BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Verificar que el usuario es dueño del negocio
  SELECT owner_id INTO v_owner_id FROM businesses WHERE id = p_business_id;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Negocio no encontrado';
  END IF;
  
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'No tienes permiso para modificar este negocio';
  END IF;
  
  -- Actualizar visibilidad
  UPDATE businesses 
  SET is_visible = p_is_visible, updated_at = now()
  WHERE id = p_business_id;
  
  RETURN p_is_visible;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
