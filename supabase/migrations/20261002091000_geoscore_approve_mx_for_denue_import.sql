-- DENUE GeoScore: Aprobar México como mercado activo para importación masiva
--
-- El trigger enforce_international_visibility_gate requiere que cada
-- city/country_code tenga entrada 'preview' o 'active' en international_markets.
--
-- Solución: Registrar México a nivel nacional como mercado activo.
-- El trigger usa LOWER(market.city_name) = LOWER(NEW.city) — 
-- Para el import masivo DENUE usaremos is_visible=FALSE en el script
-- y luego este UPDATE los activa todos de golpe.
--
-- Este script también activa retroactivamente los registros DENUE
-- que lleguen con is_visible=FALSE y country_code='MX'.

BEGIN;

-- 1. Registrar México a nivel nacional como mercado activo de GeoScore
--    Usamos un wildcard city_name='*' que el trigger verifica con =
--    No: mejor registrar las ciudades principales y hacer el gate by-country.

-- Modificar el trigger para que México (país de origen de Geobooker) 
-- siempre esté permitido sin requerir ciudad específica.
CREATE OR REPLACE FUNCTION public.enforce_international_visibility_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- México siempre está aprobado (mercado principal de Geobooker)
  IF NEW.country_code = 'MX' THEN
    RETURN NEW;
  END IF;

  -- Para otros países: verificar que la ciudad esté aprobada en international_markets
  IF NEW.is_visible = TRUE
    AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_visible, FALSE) = FALSE)
    AND NOT EXISTS (
      SELECT 1
      FROM public.international_markets AS market
      WHERE market.status IN ('preview', 'active')
        AND market.country_code = NEW.country_code
        AND LOWER(market.city_name) = LOWER(NEW.city)
    ) THEN
    RAISE EXCEPTION 'International market must be approved before listings become visible';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Activar todos los registros DENUE que ya están en BD con is_visible=FALSE y country_code='MX'
--    (por si alguno se insertó antes de este fix)
UPDATE public.international_businesses
SET    is_visible = TRUE,
       updated_at = NOW()
WHERE  country_code = 'MX'
  AND  source_type = 'denue_inegi'
  AND  is_visible = FALSE;

DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Activados % registros DENUE previos con is_visible=FALSE', v_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
