-- =====================================================
-- Script SQL para Sistema Premium
-- Ejecutar DESPUÉS de businesses_schema.sql
-- =====================================================

-- 1. Agregar columnas de Premium a user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE;

-- 2. Comentarios
COMMENT ON COLUMN user_profiles.is_premium IS 'Indica si el usuario tiene plan premium activo';
COMMENT ON COLUMN user_profiles.premium_since IS 'Fecha de inicio del plan premium';
COMMENT ON COLUMN user_profiles.premium_until IS 'Fecha de vencimiento del plan premium';

-- 3. Función para verificar límite de negocios
CREATE OR REPLACE FUNCTION check_business_limit()
RETURNS TRIGGER AS $$
DECLARE
  business_count INT;
  is_user_premium BOOLEAN;
BEGIN
  -- Contar negocios del usuario
  SELECT COUNT(*) INTO business_count
  FROM businesses
  WHERE owner_id = NEW.owner_id;

  -- Verificar si es premium
  SELECT is_premium INTO is_user_premium
  FROM user_profiles
  WHERE id = NEW.owner_id;

  -- Si no es premium y ya tiene 2 negocios, rechazar
  IF NOT COALESCE(is_user_premium, false) AND business_count >= 2 THEN
    RAISE EXCEPTION 'Plan gratuito permite máximo 2 negocios. Actualiza a Premium.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para verificar límite antes de insertar
DROP TRIGGER IF EXISTS enforce_business_limit ON businesses;
CREATE TRIGGER enforce_business_limit
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION check_business_limit();

-- 5. Verificación
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name LIKE '%premium%';
