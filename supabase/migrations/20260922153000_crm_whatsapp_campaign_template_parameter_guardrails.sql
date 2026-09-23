-- WhatsApp Campaign Guardrails
-- Purpose:
-- 1) Ensure campaign members get safe template parameters before dispatch.
-- 2) Fail closed if a campaign outbound job would be inserted with missing template parameters.
-- 3) Keep these controls server-side; no access for anon/authenticated.

CREATE OR REPLACE FUNCTION crm.build_whatsapp_campaign_template_parameters(
  p_variable_count INTEGER,
  p_contact_name TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_goal TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public', 'crm'
AS $$
DECLARE
  safe_count INTEGER := LEAST(GREATEST(COALESCE(p_variable_count, 0), 0), 10);
  label_name TEXT;
  label_market TEXT;
  label_industry TEXT;
  label_goal TEXT;
  params TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF safe_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  label_name := NULLIF(btrim(COALESCE(p_contact_name, p_account_name, '')), '');
  IF label_name IS NULL THEN
    label_name := 'tu negocio';
  END IF;

  label_market := NULLIF(btrim(COALESCE(p_city, p_country_code, '')), '');
  IF label_market IS NULL THEN
    label_market := 'tu mercado';
  END IF;

  label_industry := NULLIF(btrim(COALESCE(p_industry, '')), '');
  IF label_industry IS NULL THEN
    label_industry := 'tu sector';
  END IF;

  label_goal := NULLIF(btrim(COALESCE(p_goal, '')), '');
  IF label_goal IS NULL THEN
    label_goal := 'visibilidad comercial';
  END IF;

  params := ARRAY[label_name, label_market, label_industry, label_goal];

  WHILE array_length(params, 1) < safe_count LOOP
    params := params || label_goal;
  END LOOP;

  RETURN to_jsonb(params[1:safe_count]);
END;
$$;

REVOKE ALL ON FUNCTION crm.build_whatsapp_campaign_template_parameters(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.build_whatsapp_campaign_template_parameters(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION crm.fill_whatsapp_campaign_member_template_parameters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'crm'
AS $$
DECLARE
  campaign_record RECORD;
  template_record RECORD;
  contact_record RECORD;
  account_record RECORD;
  existing_count INTEGER;
BEGIN
  IF NEW.campaign_id IS NULL OR NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.* INTO campaign_record
  FROM crm.campaigns c
  WHERE c.id = NEW.campaign_id AND c.channel = 'whatsapp';

  IF campaign_record.id IS NULL OR campaign_record.template_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT wt.* INTO template_record
  FROM crm.whatsapp_templates wt
  WHERE wt.id = campaign_record.template_id;

  IF template_record.id IS NULL OR COALESCE(template_record.variable_count, 0) <= 0 THEN
    NEW.template_parameters := '[]'::jsonb;
    RETURN NEW;
  END IF;

  IF NEW.template_parameters IS NOT NULL
    AND jsonb_typeof(NEW.template_parameters) = 'array'
  THEN
    SELECT count(*)::integer INTO existing_count
    FROM jsonb_array_elements(NEW.template_parameters) AS param(value)
    WHERE jsonb_typeof(param.value) = 'string'
      AND NULLIF(btrim(param.value #>> '{}'), '') IS NOT NULL
      AND length(param.value #>> '{}') <= 1024;

    IF existing_count = template_record.variable_count THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT c.* INTO contact_record
  FROM crm.contacts c
  WHERE c.id = NEW.contact_id;

  SELECT a.* INTO account_record
  FROM crm.accounts a
  WHERE a.id = NEW.account_id;

  IF account_record.id IS NULL THEN
    SELECT a1.* INTO account_record
    FROM crm.account_contacts ac
    JOIN crm.accounts a1 ON a1.id = ac.account_id
    WHERE ac.contact_id = NEW.contact_id
    ORDER BY ac.is_primary DESC, ac.created_at DESC
    LIMIT 1;
  END IF;

  NEW.template_parameters := crm.build_whatsapp_campaign_template_parameters(
    template_record.variable_count,
    COALESCE(contact_record.full_name, contact_record.first_name),
    account_record.display_name,
    account_record.city,
    COALESCE(NEW.recipient_country_code, contact_record.country_code, account_record.country_code),
    account_record.industry,
    campaign_record.campaign_goal
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fill_whatsapp_campaign_member_template_parameters
  ON crm.campaign_members;

CREATE TRIGGER fill_whatsapp_campaign_member_template_parameters
BEFORE INSERT OR UPDATE OF campaign_id, contact_id, account_id, recipient_country_code, template_parameters, eligibility_status
ON crm.campaign_members
FOR EACH ROW
WHEN (NEW.eligibility_status = 'eligible')
EXECUTE FUNCTION crm.fill_whatsapp_campaign_member_template_parameters();

REVOKE ALL ON FUNCTION crm.fill_whatsapp_campaign_member_template_parameters()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.fill_whatsapp_campaign_member_template_parameters()
  TO service_role;

CREATE OR REPLACE FUNCTION crm.guard_whatsapp_campaign_outbound_job_template_parameters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'crm'
AS $$
DECLARE
  payload_value JSONB;
  template_id UUID;
  member_id UUID;
  template_record RECORD;
  parameter_count INTEGER;
  valid_parameter_count INTEGER;
BEGIN
  IF NEW.channel <> 'whatsapp' OR NEW.job_type <> 'campaign' THEN
    RETURN NEW;
  END IF;

  payload_value := COALESCE(NEW.request_payload, NEW.payload, '{}'::jsonb);
  template_id := NULLIF(payload_value->>'templateId', '')::uuid;
  member_id := NULLIF(payload_value->>'campaignMemberId', '')::uuid;

  IF template_id IS NULL OR member_id IS NULL THEN
    RAISE EXCEPTION 'campaign_job_missing_template_or_member'
      USING ERRCODE = '22023';
  END IF;

  SELECT wt.* INTO template_record
  FROM crm.whatsapp_templates wt
  WHERE wt.id = template_id;

  IF template_record.id IS NULL THEN
    RAISE EXCEPTION 'campaign_job_template_not_found'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(template_record.variable_count, 0) = 0 THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(payload_value->'templateParameters') <> 'array' THEN
    RAISE EXCEPTION 'campaign_job_template_parameters_missing'
      USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*)::integer,
    count(*) FILTER (
      WHERE jsonb_typeof(param.value) = 'string'
        AND NULLIF(btrim(param.value #>> '{}'), '') IS NOT NULL
        AND length(param.value #>> '{}') <= 1024
    )::integer
  INTO parameter_count, valid_parameter_count
  FROM jsonb_array_elements(payload_value->'templateParameters') AS param(value);

  IF parameter_count <> template_record.variable_count
    OR valid_parameter_count <> template_record.variable_count THEN
    RAISE EXCEPTION 'campaign_job_template_parameter_count_mismatch'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_whatsapp_campaign_outbound_job_template_parameters
  ON crm.outbound_jobs;

CREATE TRIGGER guard_whatsapp_campaign_outbound_job_template_parameters
BEFORE INSERT OR UPDATE OF request_payload, payload, channel, job_type
ON crm.outbound_jobs
FOR EACH ROW
EXECUTE FUNCTION crm.guard_whatsapp_campaign_outbound_job_template_parameters();

REVOKE ALL ON FUNCTION crm.guard_whatsapp_campaign_outbound_job_template_parameters()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.guard_whatsapp_campaign_outbound_job_template_parameters()
  TO service_role;

COMMENT ON FUNCTION crm.build_whatsapp_campaign_template_parameters(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
IS 'Builds safe default WhatsApp template parameters for CRM campaign members. Does not read secrets.';

COMMENT ON TRIGGER fill_whatsapp_campaign_member_template_parameters ON crm.campaign_members
IS 'Autofills safe template parameters for eligible WhatsApp campaign members before dispatch.';

COMMENT ON TRIGGER guard_whatsapp_campaign_outbound_job_template_parameters ON crm.outbound_jobs
IS 'Fail-closed guard that blocks WhatsApp campaign jobs with missing template variables.';
