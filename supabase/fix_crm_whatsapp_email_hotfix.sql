-- ==========================================================
-- HOTFIX: CRM WhatsApp + Email + n8n readiness
-- Fixes:
-- 1) Error al enviar WhatsApp: permission denied for table users
-- 2) Error preparando cola: column mc.email_sent_count does not exist
-- Run in Supabase SQL Editor.
-- ==========================================================

CREATE SCHEMA IF NOT EXISTS private;

-- ----------------------------------------------------------
-- 1. Safe admin helpers for RLS
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.id = check_user_id
    );
$$;

REVOKE ALL ON FUNCTION private.is_admin(UUID) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT private.is_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- ----------------------------------------------------------
-- 2. Bring marketing_contacts to the shape expected by the CRM
-- ----------------------------------------------------------
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending';
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS last_email_sent TIMESTAMPTZ;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS email_sent_count INTEGER DEFAULT 0;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS assigned_email_sender TEXT;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS email_opened BOOLEAN DEFAULT FALSE;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS email_clicked BOOLEAN DEFAULT FALSE;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT FALSE;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'pending';
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE marketing_contacts
SET email_sent_count = 0
WHERE email_sent_count IS NULL;

UPDATE marketing_contacts
SET email_status = 'pending'
WHERE email_status IS NULL;

UPDATE marketing_contacts
SET whatsapp_status = 'pending'
WHERE whatsapp_status IS NULL;

-- ----------------------------------------------------------
-- 3. Queue/history tables: columns used by current code
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES marketing_contacts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_queue
    ADD COLUMN IF NOT EXISTS email_round INTEGER DEFAULT 1;

ALTER TABLE email_queue
    ADD COLUMN IF NOT EXISTS message_id TEXT;

ALTER TABLE email_queue
    ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_contact_id ON email_queue(contact_id);

CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES marketing_contacts(id) ON DELETE CASCADE,
    phone_number TEXT,
    source TEXT DEFAULT 'csv',
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error_message TEXT
);

ALTER TABLE whatsapp_queue ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';
ALTER TABLE whatsapp_queue ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE whatsapp_queue ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_contact_id ON whatsapp_queue(contact_id);

CREATE TABLE IF NOT EXISTS campaign_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES marketing_contacts(id) ON DELETE CASCADE,
    campaign_type TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    message_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_history ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE campaign_history ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_campaign_history_type ON campaign_history(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_history_sent_at ON campaign_history(sent_at);

CREATE TABLE IF NOT EXISTS campaign_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    source TEXT NOT NULL CHECK (source IN ('csv', 'apify', 'google_places', 'manual')),
    daily_limit INTEGER NOT NULL DEFAULT 10 CHECK (daily_limit >= 0 AND daily_limit <= 500),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel, source)
);

INSERT INTO campaign_config (channel, source, daily_limit, priority, is_active)
VALUES
    ('whatsapp', 'google_places', 10, 2, TRUE),
    ('whatsapp', 'apify', 10, 1, TRUE),
    ('email', 'csv', 100, 2, TRUE),
    ('email', 'apify', 0, 1, TRUE)
ON CONFLICT (channel, source) DO UPDATE
SET daily_limit = EXCLUDED.daily_limit,
    priority = EXCLUDED.priority,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

CREATE TABLE IF NOT EXISTS campaign_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stats_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City')::DATE,
    channel TEXT NOT NULL,
    source TEXT NOT NULL,
    sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    converted INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stats_date, channel, source)
);

CREATE INDEX IF NOT EXISTS idx_campaign_daily_stats_date ON campaign_daily_stats(stats_date);

-- ----------------------------------------------------------
-- 4. Email templates: current sender expects template_type
-- ----------------------------------------------------------
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ----------------------------------------------------------
-- 5. Unified WhatsApp table + safe RPCs
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS unified_whatsapp_outreach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    normalized_phone TEXT NOT NULL,
    contact_name TEXT,
    company_name TEXT,
    source TEXT NOT NULL CHECK (source IN ('scan_invite', 'apify', 'crm_queue', 'manual')),
    source_id UUID,
    message_sent TEXT,
    message_language TEXT DEFAULT 'es' CHECK (message_language IN ('es', 'en')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    response_text TEXT,
    converted BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(10,2),
    sent_by_user_id UUID REFERENCES auth.users(id),
    country_code TEXT,
    timezone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_unique_phone
ON unified_whatsapp_outreach(normalized_phone);

CREATE INDEX IF NOT EXISTS idx_unified_whatsapp_sent_at
ON unified_whatsapp_outreach(sent_at DESC);

CREATE OR REPLACE FUNCTION is_phone_already_contacted(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    normalized TEXT;
BEGIN
    normalized := REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

    IF LENGTH(normalized) = 10 THEN
        normalized := '+52' || normalized;
    ELSIF normalized <> '' AND normalized NOT LIKE '+%' THEN
        normalized := '+' || normalized;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM unified_whatsapp_outreach
        WHERE normalized_phone = normalized
    );
END;
$$;

CREATE OR REPLACE FUNCTION register_whatsapp_sent(
    p_phone TEXT,
    p_contact_name TEXT,
    p_company_name TEXT,
    p_source TEXT,
    p_message TEXT,
    p_language TEXT DEFAULT 'es',
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    normalized TEXT;
    new_id UUID;
BEGIN
    normalized := REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

    IF LENGTH(normalized) = 10 THEN
        normalized := '+52' || normalized;
    ELSIF normalized <> '' AND normalized NOT LIKE '+%' THEN
        normalized := '+' || normalized;
    END IF;

    INSERT INTO unified_whatsapp_outreach (
        phone,
        normalized_phone,
        contact_name,
        company_name,
        source,
        message_sent,
        message_language,
        status,
        sent_at,
        sent_by_user_id,
        updated_at
    )
    VALUES (
        p_phone,
        normalized,
        p_contact_name,
        p_company_name,
        p_source,
        p_message,
        COALESCE(p_language, 'es'),
        'sent',
        NOW(),
        COALESCE(p_user_id, auth.uid()),
        NOW()
    )
    ON CONFLICT (normalized_phone) DO UPDATE
    SET phone = EXCLUDED.phone,
        contact_name = COALESCE(EXCLUDED.contact_name, unified_whatsapp_outreach.contact_name),
        company_name = COALESCE(EXCLUDED.company_name, unified_whatsapp_outreach.company_name),
        source = EXCLUDED.source,
        message_sent = EXCLUDED.message_sent,
        message_language = EXCLUDED.message_language,
        status = 'sent',
        sent_at = NOW(),
        sent_by_user_id = COALESCE(EXCLUDED.sent_by_user_id, unified_whatsapp_outreach.sent_by_user_id),
        updated_at = NOW()
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION is_phone_already_contacted(TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION register_whatsapp_sent(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role, anon;

-- ----------------------------------------------------------
-- 6. Email queue generator expected by Netlify + UI
-- ----------------------------------------------------------
DROP FUNCTION IF EXISTS generate_daily_email_queue(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION generate_daily_email_queue(
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
    DELETE FROM email_queue
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '7 days';

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
                    COALESCE(mc.email_sent_count, 0) ASC,
                    CASE mc.tier
                        WHEN 'AAA' THEN 1
                        WHEN 'AA' THEN 2
                        WHEN 'A' THEN 3
                        WHEN 'B' THEN 4
                        ELSE 5
                    END,
                    RANDOM()
            ) AS tier_rank
        FROM marketing_contacts mc
        WHERE COALESCE(mc.is_active, TRUE) = TRUE
          AND mc.email IS NOT NULL
          AND TRIM(mc.email) <> ''
          AND COALESCE(mc.email_status, 'pending') NOT IN ('bounced', 'unsubscribed')
          AND (
                COALESCE(mc.email_sent_count, 0) = 0
                OR mc.email_status IS NULL
                OR mc.email_status = 'pending'
                OR (mc.email_status = 'sent' AND mc.last_email_sent < NOW() - INTERVAL '30 days')
          )
          AND (p_tier_filter IS NULL OR mc.tier = p_tier_filter)
          AND NOT EXISTS (
                SELECT 1
                FROM email_queue eq
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
        LIMIT p_limit
    )
    INSERT INTO email_queue (contact_id, priority, status, email_round)
    SELECT id, priority, 'pending', email_round
    FROM limited_contacts;

    GET DIAGNOSTICS v_contacts_added = ROW_COUNT;

    SELECT jsonb_object_agg(tier, count) INTO v_tier_counts
    FROM (
        SELECT mc.tier, COUNT(*) AS count
        FROM email_queue eq
        JOIN marketing_contacts mc ON mc.id = eq.contact_id
        WHERE eq.status = 'pending'
        GROUP BY mc.tier
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
        FROM email_queue eq
        WHERE eq.status = 'pending'
        GROUP BY eq.email_round
    ) round_summary;

    RETURN QUERY
    SELECT
        v_contacts_added,
        COALESCE(v_tier_counts, '{}'::jsonb),
        COALESCE(v_round_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_daily_email_queue(INTEGER, TEXT) TO authenticated, service_role, anon;

-- ----------------------------------------------------------
-- 7. WhatsApp queue generator compatible with current CRM
-- ----------------------------------------------------------
DROP FUNCTION IF EXISTS generate_daily_whatsapp_queue(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION generate_daily_whatsapp_queue(
    p_limit INTEGER DEFAULT 20,
    p_tier_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    contacts_added INTEGER,
    tier_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_contacts_added INTEGER := 0;
    v_tier_counts JSONB;
BEGIN
    DELETE FROM whatsapp_queue
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '24 hours';

    WITH ranked_contacts AS (
        SELECT
            mc.id,
            mc.phone,
            mc.tier,
            CASE mc.tier
                WHEN 'AAA' THEN 4
                WHEN 'AA' THEN 3
                WHEN 'A' THEN 2
                ELSE 1
            END AS priority
        FROM marketing_contacts mc
        WHERE mc.phone IS NOT NULL
          AND TRIM(mc.phone) <> ''
          AND COALESCE(mc.whatsapp_status, 'pending') = 'pending'
          AND (p_tier_filter IS NULL OR mc.tier = p_tier_filter)
          AND NOT EXISTS (
                SELECT 1
                FROM whatsapp_queue wq
                WHERE wq.contact_id = mc.id
                  AND wq.status = 'pending'
          )
        ORDER BY priority DESC, RANDOM()
        LIMIT p_limit
    )
    INSERT INTO whatsapp_queue (contact_id, phone_number, priority, status)
    SELECT id, phone, priority, 'pending'
    FROM ranked_contacts;

    GET DIAGNOSTICS v_contacts_added = ROW_COUNT;

    SELECT jsonb_object_agg(tier, count) INTO v_tier_counts
    FROM (
        SELECT mc.tier, COUNT(*) AS count
        FROM whatsapp_queue wq
        JOIN marketing_contacts mc ON mc.id = wq.contact_id
        WHERE wq.status = 'pending'
        GROUP BY mc.tier
    ) tier_summary;

    RETURN QUERY
    SELECT v_contacts_added, COALESCE(v_tier_counts, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION generate_daily_whatsapp_queue(INTEGER, TEXT) TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION mark_whatsapp_sent(
    p_contact_id UUID,
    p_queue_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE whatsapp_queue
    SET status = 'sent',
        sent_at = NOW()
    WHERE id = p_queue_id;

    UPDATE marketing_contacts
    SET whatsapp_status = 'sent',
        whatsapp_sent_at = NOW()
    WHERE id = p_contact_id;

    INSERT INTO campaign_history (contact_id, campaign_type, status, sent_at)
    VALUES (p_contact_id, 'whatsapp', 'sent', NOW());

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_whatsapp_sent(UUID, UUID) TO authenticated, service_role, anon;

-- ----------------------------------------------------------
-- 8. CRM v2 stats/send RPCs expected by admin UI
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_daily_campaign_stats()
RETURNS TABLE (
    channel TEXT,
    source TEXT,
    daily_limit INTEGER,
    sent_today INTEGER,
    remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.channel,
        cc.source,
        cc.daily_limit,
        COALESCE(cds.sent, 0)::INTEGER AS sent_today,
        (cc.daily_limit - COALESCE(cds.sent, 0))::INTEGER AS remaining
    FROM campaign_config cc
    LEFT JOIN campaign_daily_stats cds
        ON cds.channel = cc.channel
       AND cds.source = cc.source
       AND cds.stats_date = (NOW() AT TIME ZONE 'America/Mexico_City')::DATE
    WHERE cc.is_active = TRUE
    ORDER BY cc.channel, cc.priority DESC;
END;
$$;

CREATE OR REPLACE FUNCTION register_campaign_send(
    p_channel TEXT,
    p_source TEXT,
    p_contact_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today_mx DATE;
BEGIN
    v_today_mx := (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;

    INSERT INTO campaign_daily_stats (stats_date, channel, source, sent)
    VALUES (v_today_mx, p_channel, p_source, 1)
    ON CONFLICT (stats_date, channel, source)
    DO UPDATE SET sent = campaign_daily_stats.sent + 1;

    IF p_channel = 'whatsapp' THEN
        UPDATE marketing_contacts
        SET whatsapp_status = 'sent',
            whatsapp_sent_at = NOW()
        WHERE id = p_contact_id;
    ELSE
        UPDATE marketing_contacts
        SET email_status = 'sent',
            last_email_sent = NOW(),
            email_sent_count = COALESCE(email_sent_count, 0) + 1
        WHERE id = p_contact_id;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION get_daily_campaign_stats() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION register_campaign_send(TEXT, TEXT, UUID) TO authenticated, service_role, anon;

-- ----------------------------------------------------------
-- 9. CRM table policies that do not depend on auth.users
-- ----------------------------------------------------------
ALTER TABLE marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_whatsapp_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only access marketing_contacts" ON marketing_contacts;
DROP POLICY IF EXISTS "Admin only access email_queue" ON email_queue;
DROP POLICY IF EXISTS "Admin only access whatsapp_queue" ON whatsapp_queue;
DROP POLICY IF EXISTS "Admin only access campaign_history" ON campaign_history;
DROP POLICY IF EXISTS "Admin only access email_templates" ON email_templates;
DROP POLICY IF EXISTS "Admin access campaign_config" ON campaign_config;
DROP POLICY IF EXISTS "Admin access campaign_daily_stats" ON campaign_daily_stats;
DROP POLICY IF EXISTS "Admin access unified_whatsapp_outreach" ON unified_whatsapp_outreach;

CREATE POLICY "Admin only access marketing_contacts"
ON marketing_contacts FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin only access email_queue"
ON email_queue FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin only access whatsapp_queue"
ON whatsapp_queue FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin only access campaign_history"
ON campaign_history FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin only access email_templates"
ON email_templates FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin access campaign_config"
ON campaign_config FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin access campaign_daily_stats"
ON campaign_daily_stats FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin access unified_whatsapp_outreach"
ON unified_whatsapp_outreach FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Service role should always work for Netlify and n8n
GRANT ALL ON marketing_contacts TO service_role;
GRANT ALL ON email_queue TO service_role;
GRANT ALL ON whatsapp_queue TO service_role;
GRANT ALL ON campaign_history TO service_role;
GRANT ALL ON email_templates TO service_role;
GRANT ALL ON campaign_config TO service_role;
GRANT ALL ON campaign_daily_stats TO service_role;
GRANT ALL ON unified_whatsapp_outreach TO service_role;

-- ----------------------------------------------------------
-- 10. Verification queries
-- ----------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'marketing_contacts'
  AND column_name IN (
      'email_status',
      'last_email_sent',
      'email_sent_count',
      'assigned_email_sender',
      'whatsapp_status',
      'whatsapp_sent_at',
      'is_active'
  )
ORDER BY column_name;

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'generate_daily_email_queue',
      'generate_daily_whatsapp_queue',
      'register_whatsapp_sent',
      'is_phone_already_contacted',
      'register_campaign_send',
      'get_daily_campaign_stats'
  )
ORDER BY routine_name;
