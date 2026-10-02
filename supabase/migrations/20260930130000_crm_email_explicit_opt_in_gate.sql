-- Keep research/open-data contacts in CRM while preventing their use in the
-- legacy Resend marketing queue without explicit, evidenced email opt-in.

BEGIN;

ALTER TABLE public.marketing_contacts
  ADD COLUMN IF NOT EXISTS email_marketing_basis TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS email_consented_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_consent_evidence_ref TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketing_contacts_email_marketing_basis_check'
      AND conrelid = 'public.marketing_contacts'::regclass
  ) THEN
    ALTER TABLE public.marketing_contacts
      ADD CONSTRAINT marketing_contacts_email_marketing_basis_check
      CHECK (email_marketing_basis IN (
        'unknown', 'explicit_opt_in', 'existing_customer', 'cold_outreach', 'transactional'
      ));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS marketing_contacts_email_campaign_eligibility_idx
  ON public.marketing_contacts (email_marketing_basis, email_consented_at)
  WHERE is_active IS DISTINCT FROM FALSE AND email IS NOT NULL;

-- Production was configured for automatic email sends before this evidence gate
-- existed. Pause first; an admin may re-enable only after the sender functions
-- are deployed and a reviewed opt-in audience exists.
UPDATE public.crm_settings
SET setting_value = jsonb_set(
      COALESCE(setting_value, '{}'::jsonb),
      '{email_sending_enabled}',
      'false'::jsonb,
      TRUE
    ),
    updated_at = NOW()
WHERE setting_key = 'campaign_limits';

DROP FUNCTION IF EXISTS public.generate_daily_email_queue(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.generate_daily_email_queue(
    p_limit INTEGER DEFAULT 100,
    p_tier_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    contacts_added INTEGER,
    tier_distribution JSONB,
    round_distribution JSONB
) AS $$
DECLARE
    v_contacts_added INTEGER := 0;
    v_tier_counts JSONB;
    v_round_counts JSONB;
BEGIN
    IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.email_queue
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '7 days';

    WITH ranked_contacts AS (
        SELECT
            mc.id,
            COALESCE(NULLIF(mc.tier, ''), 'B') AS tier,
            COALESCE(mc.email_sent_count, 0) AS email_sent_count,
            CASE
                WHEN COALESCE(mc.email_sent_count, 0) = 0 THEN 1
                WHEN COALESCE(mc.email_sent_count, 0) = 1 THEN 2
                ELSE 3
            END AS email_round,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(NULLIF(mc.tier, ''), 'B')
                ORDER BY
                    COALESCE(mc.email_sent_count, 0) ASC,
                    CASE COALESCE(NULLIF(mc.tier, ''), 'B')
                        WHEN 'AAA' THEN 1 WHEN 'AA' THEN 2 WHEN 'A' THEN 3 WHEN 'B' THEN 4 ELSE 5
                    END,
                    RANDOM()
            ) AS tier_rank
        FROM public.marketing_contacts mc
        WHERE COALESCE(mc.is_active, TRUE) = TRUE
          AND mc.email IS NOT NULL
          AND TRIM(mc.email) <> ''
          AND mc.email_marketing_basis = 'explicit_opt_in'
          AND mc.email_consented_at IS NOT NULL
          AND NULLIF(BTRIM(mc.email_consent_evidence_ref), '') IS NOT NULL
          AND COALESCE(mc.email_unsubscribed, FALSE) = FALSE
          AND LOWER(COALESCE(NULLIF(TRIM(mc.email_status), ''), 'pending')) NOT IN (
                'bounced', 'bounce', 'complained', 'complaint', 'suppressed',
                'failed', 'spam', 'invalid', 'unsubscribed'
          )
          AND NOT EXISTS (
                SELECT 1
                FROM crm.suppressions suppression
                WHERE suppression.identifier_type = 'email'
                  AND suppression.normalized_identifier = LOWER(BTRIM(mc.email))
                  AND suppression.status = 'active'
                  AND (suppression.channel IS NULL OR suppression.channel = 'email')
          )
          AND (
                COALESCE(mc.email_sent_count, 0) = 0
                OR LOWER(COALESCE(NULLIF(TRIM(mc.email_status), ''), 'pending')) IN (
                    'pending', 'new', 'ready', 'valid', 'verified', 'not_sent',
                    'not sent', 'no_enviado', 'sin_enviar'
                )
                OR (
                    LOWER(COALESCE(NULLIF(TRIM(mc.email_status), ''), 'pending')) IN ('sent', 'delivered', 'opened', 'clicked')
                    AND mc.last_email_sent < NOW() - INTERVAL '30 days'
                )
          )
          AND (p_tier_filter IS NULL OR mc.tier = p_tier_filter)
          AND NOT EXISTS (
                SELECT 1 FROM public.email_queue eq
                WHERE eq.contact_id = mc.id AND eq.status = 'pending'
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
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    )
    INSERT INTO public.email_queue (contact_id, priority, status, email_round)
    SELECT id, priority, 'pending', email_round
    FROM limited_contacts;

    GET DIAGNOSTICS v_contacts_added = ROW_COUNT;

    SELECT jsonb_object_agg(tier, count) INTO v_tier_counts
    FROM (
        SELECT COALESCE(NULLIF(mc.tier, ''), 'B') AS tier, COUNT(*) AS count
        FROM public.email_queue eq
        JOIN public.marketing_contacts mc ON mc.id = eq.contact_id
        WHERE eq.status = 'pending'
        GROUP BY COALESCE(NULLIF(mc.tier, ''), 'B')
    ) tier_summary;

    SELECT jsonb_object_agg(round_name, count) INTO v_round_counts
    FROM (
        SELECT
            CASE eq.email_round WHEN 1 THEN 'invitacion_inicial' WHEN 2 THEN 'seguimiento' ELSE 're_engagement' END AS round_name,
            COUNT(*) AS count
        FROM public.email_queue eq
        WHERE eq.status = 'pending'
        GROUP BY eq.email_round
    ) round_summary;

    RETURN QUERY SELECT
        v_contacts_added,
        COALESCE(v_tier_counts, '{}'::jsonb),
        COALESCE(v_round_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, crm;

REVOKE ALL ON FUNCTION public.generate_daily_email_queue(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_daily_email_queue(INTEGER, TEXT) TO authenticated, service_role;

COMMENT ON COLUMN public.marketing_contacts.email_marketing_basis IS
  'How the email may be used. Resend marketing queue accepts explicit_opt_in only.';
COMMENT ON COLUMN public.marketing_contacts.email_consent_evidence_ref IS
  'Auditable reference to the form, import evidence, CRM event or consent artifact.';
COMMENT ON FUNCTION public.generate_daily_email_queue(INTEGER, TEXT) IS
  'Builds the Resend marketing queue only from explicit, evidenced opt-ins not present in crm.suppressions.';

COMMIT;
