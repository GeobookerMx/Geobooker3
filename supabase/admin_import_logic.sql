-- ======================================================
-- ADMIN IMPORT LOGIC & BUSINESS CLAIM SYSTEM
-- Soporte para importación de 18k contactos
-- ======================================================

-- 1. Actualizar tabla de negocios con campos de control
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS claim_requests_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS manager_name TEXT,      -- Nombre del contacto
ADD COLUMN IF NOT EXISTS manager_role TEXT,      -- Puesto (ej. Director General)
ADD COLUMN IF NOT EXISTS city TEXT,              -- Ciudad
ADD COLUMN IF NOT EXISTS postal_code TEXT,       -- CP
ADD COLUMN IF NOT EXISTS suburb TEXT,            -- Colonia
ADD COLUMN IF NOT EXISTS employee_count TEXT,    -- Número de personal
ADD COLUMN IF NOT EXISTS website_url TEXT,       -- Sitio web (www)
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es', -- Idioma para correos (es, en, zh, etc)
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'MX';      -- País del lead (MX, US, CA, ES)

-- 2. Asegurar campo status permita 'imported' o 'pending_verification'
-- (Si es un enum, habría que actualizarlo, si es texto no hay problema)

-- 3. Crear función para verificar reclamo (Security Definer para bypass de dueños temporales)
CREATE OR REPLACE FUNCTION claim_business(p_business_id UUID, p_user_id UUID, p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    -- Validar token y estado
    SELECT (verification_token = p_token AND is_claimed = false) INTO v_valid
    FROM public.businesses
    WHERE id = p_business_id;

    IF v_valid THEN
        UPDATE public.businesses 
        SET 
            owner_id = p_user_id,
            is_claimed = true,
            verification_token = NULL,
            status = 'approved' -- Auto-aprobar si el reclamo es válido
        WHERE id = p_business_id;
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Actualizar RLS para búsquedas públicas de negocios no reclamados
-- Los negocios no reclamados DEBEN aparecer en el mapa para atraer tráfico
DROP POLICY IF EXISTS "public_select_unclaimed" ON public.businesses;
CREATE POLICY "public_select_unclaimed"
ON public.businesses 
FOR SELECT 
TO anon, authenticated
USING (is_claimed = false AND status = 'pending_verification');

COMMENT ON COLUMN public.businesses.is_claimed IS 'Indica si el negocio ya tiene un dueño verificado en la plataforma';
