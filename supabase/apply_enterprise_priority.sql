-- ==============================================================================
-- FIX: PRIORIDAD ENTERPRISE 70/30 EN ANUNCIOS
-- ==============================================================================
-- Descripción: Actualiza la función de entrega de anuncios para dar una 
-- probabilidad del ~70% de aparición a campañas Enterprise vs Locales.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_targeted_ads(
  p_space_name TEXT,
  p_user_country TEXT DEFAULT NULL,
  p_user_language TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  campaign_id UUID,
  creative_id UUID,
  display_name TEXT,
  title TEXT,
  image_url TEXT,
  cta_url TEXT,
  cta_text TEXT,
  advertiser_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    cr.id as creative_id,
    s.display_name,
    cr.title,
    cr.image_url,
    cr.cta_url,
    cr.cta_text,
    c.advertiser_name
  FROM ad_campaigns c
  JOIN ad_spaces s ON c.ad_space_id = s.id
  LEFT JOIN ad_creatives cr ON cr.campaign_id = c.id
  WHERE 
    s.name = p_space_name
    AND c.status = 'active'
    AND s.is_active = true
    AND c.start_date <= CURRENT_DATE
    AND c.end_date >= CURRENT_DATE
    -- Lógica de Matching JSONB
    AND (
      -- Si targeting está vacío, es global
      c.audience_targeting = '{}'::jsonb
      OR (
        -- Match de País (si está definido en la campaña)
        (NOT (c.audience_targeting ? 'countries') OR (c.audience_targeting->'countries') ? p_user_country)
        AND
        -- Match de Idioma
        (NOT (c.audience_targeting ? 'languages') OR (c.audience_targeting->'languages') ? p_user_language)
        AND
        -- Match de Dispositivo
        (NOT (c.audience_targeting ? 'devices') OR (c.audience_targeting->'devices') ? p_device_type)
      )
    )
  -- Ordenamiento con Boost Enterprise:
  -- Agregamos +0.23 al random de campañas no locales para darles estadísticamente ~70% de visibilidad
  ORDER BY (
    CASE 
      WHEN c.campaign_type != 'local' THEN random() + 0.23 
      ELSE random() 
    END
  ) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar permisos
GRANT EXECUTE ON FUNCTION get_targeted_ads(text, text, text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_targeted_ads(text, text, text, text, integer) TO authenticated;
