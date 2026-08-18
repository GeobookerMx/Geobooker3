-- CRM email delivery hardening.
-- Additive and fail-closed: this migration sends no email, imports no contacts,
-- and does not activate Resend, queues, WhatsApp or n8n.

ALTER TABLE public.marketing_contacts
  ADD COLUMN IF NOT EXISTS email_marketing_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_contact_basis TEXT,
  ADD COLUMN IF NOT EXISTS email_contact_basis_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_contact_basis_source TEXT,
  ADD COLUMN IF NOT EXISTS email_suppression_reason TEXT,
  ADD COLUMN IF NOT EXISTS email_engagement_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketing_contacts_email_contact_basis_check'
      AND conrelid = 'public.marketing_contacts'::regclass
  ) THEN
    ALTER TABLE public.marketing_contacts
      ADD CONSTRAINT marketing_contacts_email_contact_basis_check
      CHECK (
        email_contact_basis IS NULL OR email_contact_basis IN (
          'account_user',
          'customer',
          'business_inquiry',
          'contract',
          'explicit_consent',
          'legitimate_interest_reviewed'
        )
      );
  END IF;
END;
$$;

COMMENT ON COLUMN public.marketing_contacts.email_marketing_allowed IS
  'Fail-closed email marketing authorization. Existing and imported contacts remain false until reviewed.';
COMMENT ON COLUMN public.marketing_contacts.email_contact_basis IS
  'Documented basis for email contact; never inferred merely from a public address.';
COMMENT ON COLUMN public.marketing_contacts.email_contact_basis_verified_at IS
  'Timestamp of the human or controlled compliance review.';
COMMENT ON COLUMN public.marketing_contacts.email_contact_basis_source IS
  'Non-secret provenance reference supporting the contact basis.';

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS is_compliance_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS compliance_version TEXT,
  ADD COLUMN IF NOT EXISTS compliance_approved_at TIMESTAMPTZ;

ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS marketing_contacts_email_delivery_eligibility_idx
  ON public.marketing_contacts (tier, crm_readiness_score DESC, created_at)
  WHERE is_active = TRUE
    AND email_marketing_allowed = TRUE
    AND email_unsubscribed = FALSE;

CREATE INDEX IF NOT EXISTS email_queue_retry_idx
  ON public.email_queue (status, next_attempt_at, priority DESC, created_at)
  WHERE status = 'pending';

-- Existing templates are not trusted implicitly. Only the three controlled
-- lifecycle templates below are approved by this release.
UPDATE public.email_templates
SET is_compliance_approved = FALSE,
    compliance_version = NULL,
    compliance_approved_at = NULL;

UPDATE public.email_templates
SET subject = '¿Eres la persona indicada para revisar Geobooker en {company_name}?',
    html_content = $template$
<p>Hola <strong>{contact_name}</strong>,</p>
<p>Te escribimos de parte de Geobooker, una plataforma para descubrir negocios y servicios.</p>
<p>Identificamos a <strong>{company_name}</strong> durante una revisión comercial. Antes de compartir información adicional, queremos confirmar si eres la persona indicada para evaluar su presencia en Geobooker.</p>
<p>Si corresponde a otra persona de tu organización, puedes indicarnos el canal adecuado. Si no deseas recibir más comunicaciones, utiliza la opción de baja incluida al final de este mensaje.</p>
<p>Saludos,<br>Equipo Geobooker</p>
$template$,
    is_active = TRUE,
    is_compliance_approved = TRUE,
    compliance_version = '2026-08-18',
    compliance_approved_at = now(),
    updated_at = now()
WHERE template_type = 'invitation';

UPDATE public.email_templates
SET subject = 'Seguimiento sobre Geobooker y {company_name}',
    html_content = $template$
<p>Hola <strong>{contact_name}</strong>,</p>
<p>Hace unos días te escribimos para confirmar si eres la persona indicada para revisar la presencia de <strong>{company_name}</strong> en Geobooker.</p>
<p>Si el tema es relevante, podemos enviarte una explicación breve y sin compromiso. Si no corresponde a tu función o prefieres no recibir seguimiento, utiliza la opción de baja al final del mensaje.</p>
<p>Saludos,<br>Equipo Geobooker</p>
$template$,
    is_active = TRUE,
    is_compliance_approved = TRUE,
    compliance_version = '2026-08-18',
    compliance_approved_at = now(),
    updated_at = now()
WHERE template_type = 'followup';

UPDATE public.email_templates
SET subject = 'Cierre de seguimiento de Geobooker para {company_name}',
    html_content = $template$
<p>Hola <strong>{contact_name}</strong>,</p>
<p>Cerramos nuestro seguimiento sobre <strong>{company_name}</strong> para evitar comunicaciones innecesarias.</p>
<p>Si deseas conocer Geobooker en otro momento, puedes visitar nuestro sitio o responder a este mensaje. No enviaremos nuevos seguimientos comerciales sin una interacción o autorización posterior.</p>
<p>Saludos,<br>Equipo Geobooker</p>
$template$,
    is_active = TRUE,
    is_compliance_approved = TRUE,
    compliance_version = '2026-08-18',
    compliance_approved_at = now(),
    updated_at = now()
WHERE template_type = 'reengagement';

-- Remove urgency-based legacy offers from active selection.
UPDATE public.email_templates
SET is_active = FALSE,
    updated_at = now()
WHERE subject ILIKE '%48 horas%';

CREATE OR REPLACE FUNCTION public.generate_daily_email_queue(
  p_limit INTEGER DEFAULT 10,
  p_tier_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  contacts_added INTEGER,
  tier_distribution JSONB,
  round_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contacts_added INTEGER := 0;
  v_tier_counts JSONB;
  v_round_counts JSONB;
BEGIN
  WITH ranked_contacts AS (
    SELECT
      mc.id,
      mc.tier,
      COALESCE(mc.email_sent_count, 0) AS email_sent_count,
      CASE
        WHEN COALESCE(mc.email_sent_count, 0) = 0 THEN 1
        WHEN COALESCE(mc.email_sent_count, 0) = 1 THEN 2
        ELSE 3
      END AS email_round,
      ROW_NUMBER() OVER (
        PARTITION BY mc.tier
        ORDER BY
          mc.crm_readiness_score DESC,
          COALESCE(mc.email_sent_count, 0) ASC,
          mc.created_at ASC,
          mc.id ASC
      ) AS tier_rank
    FROM public.marketing_contacts mc
    WHERE mc.is_active = TRUE
      AND mc.email_marketing_allowed = TRUE
      AND mc.email_unsubscribed = FALSE
      AND mc.email_contact_basis IS NOT NULL
      AND mc.email_contact_basis_verified_at IS NOT NULL
      AND lower(COALESCE(mc.compliance_risk, '')) = 'low'
      AND COALESCE(mc.crm_readiness_score, 0) >= 70
      AND mc.email IS NOT NULL
      AND trim(mc.email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      AND COALESCE(lower(mc.email_status), 'pending') NOT IN (
        'bounced', 'unsubscribed', 'complained', 'suppressed'
      )
      AND (
        COALESCE(mc.email_sent_count, 0) = 0
        OR mc.email_status IS NULL
        OR lower(mc.email_status) = 'pending'
        OR (
          lower(mc.email_status) IN ('sent', 'delivered')
          AND mc.last_email_sent < now() - interval '30 days'
        )
      )
      AND (p_tier_filter IS NULL OR mc.tier = p_tier_filter)
      AND NOT EXISTS (
        SELECT 1
        FROM public.email_queue eq
        WHERE eq.contact_id = mc.id
          AND eq.status = 'pending'
      )
  ),
  limited_contacts AS (
    SELECT
      id,
      tier,
      email_round,
      CASE tier WHEN 'AAA' THEN 4 WHEN 'AA' THEN 3 WHEN 'A' THEN 2 ELSE 1 END AS priority
    FROM ranked_contacts
    ORDER BY
      email_round ASC,
      CASE tier WHEN 'AAA' THEN 1 WHEN 'AA' THEN 2 WHEN 'A' THEN 3 WHEN 'B' THEN 4 ELSE 5 END,
      tier_rank
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
  )
  INSERT INTO public.email_queue (contact_id, priority, status, email_round)
  SELECT id, priority, 'pending', email_round
  FROM limited_contacts;

  GET DIAGNOSTICS v_contacts_added = ROW_COUNT;

  SELECT jsonb_object_agg(tier, count) INTO v_tier_counts
  FROM (
    SELECT mc.tier, count(*) AS count
    FROM public.email_queue eq
    JOIN public.marketing_contacts mc ON mc.id = eq.contact_id
    WHERE eq.status = 'pending'
      AND mc.is_active = TRUE
      AND mc.email_marketing_allowed = TRUE
      AND mc.email_unsubscribed = FALSE
      AND mc.email_contact_basis IS NOT NULL
      AND mc.email_contact_basis_verified_at IS NOT NULL
      AND lower(COALESCE(mc.compliance_risk, '')) = 'low'
      AND COALESCE(mc.crm_readiness_score, 0) >= 70
    GROUP BY mc.tier
  ) tier_summary;

  SELECT jsonb_object_agg(round_name, count) INTO v_round_counts
  FROM (
    SELECT
      CASE eq.email_round WHEN 1 THEN 'invitacion_inicial' WHEN 2 THEN 'seguimiento' ELSE 're_engagement' END AS round_name,
      count(*) AS count
    FROM public.email_queue eq
    JOIN public.marketing_contacts mc ON mc.id = eq.contact_id
    WHERE eq.status = 'pending'
      AND mc.is_active = TRUE
      AND mc.email_marketing_allowed = TRUE
      AND mc.email_unsubscribed = FALSE
      AND mc.email_contact_basis IS NOT NULL
      AND mc.email_contact_basis_verified_at IS NOT NULL
      AND lower(COALESCE(mc.compliance_risk, '')) = 'low'
      AND COALESCE(mc.crm_readiness_score, 0) >= 70
    GROUP BY eq.email_round
  ) round_summary;

  RETURN QUERY SELECT
    v_contacts_added,
    COALESCE(v_tier_counts, '{}'::jsonb),
    COALESCE(v_round_counts, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.generate_daily_email_queue(INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_email_queue(INTEGER, TEXT) TO service_role;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.email_queue FROM anon, authenticated;

COMMENT ON FUNCTION public.generate_daily_email_queue(INTEGER, TEXT) IS
  'Server-only, fail-closed CRM queue generation. Never deletes existing queue rows.';
