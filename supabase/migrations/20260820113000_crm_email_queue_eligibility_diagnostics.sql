-- Geobooker CRM email queue eligibility hardening, Aug 2026.
-- Fixes the "contacts_added: 0" ambiguity by accepting common unsent CRM statuses
-- while still excluding bounces, complaints, suppressions and opt-outs.

BEGIN;

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
                        WHEN 'AAA' THEN 1
                        WHEN 'AA' THEN 2
                        WHEN 'A' THEN 3
                        WHEN 'B' THEN 4
                        ELSE 5
                    END,
                    RANDOM()
            ) AS tier_rank
        FROM public.marketing_contacts mc
        WHERE COALESCE(mc.is_active, TRUE) = TRUE
          AND mc.email IS NOT NULL
          AND TRIM(mc.email) <> ''
          AND COALESCE(mc.email_unsubscribed, FALSE) = FALSE
          AND LOWER(COALESCE(NULLIF(TRIM(mc.email_status), ''), 'pending')) NOT IN (
                'bounced',
                'bounce',
                'complained',
                'complaint',
                'suppressed',
                'failed',
                'spam',
                'invalid',
                'unsubscribed'
          )
          AND (
                COALESCE(mc.email_sent_count, 0) = 0
                OR LOWER(COALESCE(NULLIF(TRIM(mc.email_status), ''), 'pending')) IN (
                    'pending',
                    'new',
                    'ready',
                    'valid',
                    'verified',
                    'not_sent',
                    'not sent',
                    'no_enviado',
                    'sin_enviar'
                )
                OR (
                    LOWER(COALESCE(NULLIF(TRIM(mc.email_status), ''), 'pending')) IN ('sent', 'delivered', 'opened', 'clicked')
                    AND mc.last_email_sent < NOW() - INTERVAL '30 days'
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
            CASE tier
                WHEN 'AAA' THEN 4
                WHEN 'AA' THEN 3
                WHEN 'A' THEN 2
                ELSE 1
            END AS priority
        FROM ranked_contacts
        ORDER BY
            email_round ASC,
            CASE tier
                WHEN 'AAA' THEN 1
                WHEN 'AA' THEN 2
                WHEN 'A' THEN 3
                WHEN 'B' THEN 4
                ELSE 5
            END,
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
            CASE eq.email_round
                WHEN 1 THEN 'invitacion_inicial'
                WHEN 2 THEN 'seguimiento'
                ELSE 're_engagement'
            END AS round_name,
            COUNT(*) AS count
        FROM public.email_queue eq
        WHERE eq.status = 'pending'
        GROUP BY eq.email_round
    ) round_summary;

    RETURN QUERY
    SELECT
        v_contacts_added,
        COALESCE(v_tier_counts, '{}'::jsonb),
        COALESCE(v_round_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.generate_daily_email_queue(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_daily_email_queue(INTEGER, TEXT) TO authenticated, service_role, anon;

COMMIT;
