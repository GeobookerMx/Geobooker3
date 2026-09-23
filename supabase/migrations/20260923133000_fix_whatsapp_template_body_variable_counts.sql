BEGIN;

-- WhatsApp provider payloads currently map CRM campaign parameters to the BODY
-- component only. Count only BODY variables for campaign guardrails. Counting
-- variables in buttons/header can block otherwise valid campaigns with
-- campaign_job_template_parameter_count_mismatch.

WITH template_body_counts AS (
  SELECT
    wt.id,
    COALESCE((
      SELECT count(DISTINCT match_value[1])::integer
      FROM jsonb_array_elements(COALESCE(wt.components, '[]'::jsonb)) AS component(value)
      CROSS JOIN LATERAL regexp_matches(
        COALESCE(component.value->>'text', ''),
        '\{\{\s*(\d+)\s*\}\}',
        'g'
      ) AS match_value
      WHERE upper(component.value->>'type') = 'BODY'
    ), 0) AS body_variable_count
  FROM crm.whatsapp_templates wt
)
UPDATE crm.whatsapp_templates wt
SET
  variable_count = tbc.body_variable_count,
  reconciliation_notes = (
    SELECT jsonb_agg(DISTINCT note)
    FROM jsonb_array_elements_text(
      COALESCE(wt.reconciliation_notes, '[]'::jsonb)
      || '["VARIABLE_COUNT_BODY_ONLY_FOR_CAMPAIGN_PAYLOAD"]'::jsonb
    ) AS notes(note)
  ),
  updated_at = now()
FROM template_body_counts tbc
WHERE wt.id = tbc.id
  AND wt.variable_count IS DISTINCT FROM tbc.body_variable_count;

-- Force eligible campaign members to rebuild safe BODY parameters through the
-- existing trigger crm.fill_whatsapp_campaign_member_template_parameters().
UPDATE crm.campaign_members cm
SET
  template_parameters = '[]'::jsonb,
  updated_at = now()
FROM crm.campaigns c
JOIN crm.whatsapp_templates wt
  ON wt.id = c.template_id
WHERE cm.campaign_id = c.id
  AND c.channel = 'whatsapp'
  AND cm.eligibility_status = 'eligible'
  AND (
    jsonb_typeof(cm.template_parameters) <> 'array'
    OR jsonb_array_length(cm.template_parameters) <> COALESCE(wt.variable_count, 0)
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
