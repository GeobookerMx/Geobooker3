-- CRM 2.0 import staging (additive and inert by default).
-- This migration does not read files, promote rows or contact anyone.

CREATE TABLE IF NOT EXISTS crm.import_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crm.import_sources(id) ON DELETE RESTRICT,
  batch_name TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  source_file_sha256 TEXT NOT NULL,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('accounts', 'contacts', 'suppressions', 'needs_review')),
  mode TEXT NOT NULL DEFAULT 'dry_run' CHECK (mode = 'dry_run'),
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN ('created', 'validating', 'review_ready', 'rejected', 'approved_for_future_import', 'failed', 'cancelled')
  ),
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  duplicate_rows INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  review_rows INTEGER NOT NULL DEFAULT 0 CHECK (review_rows >= 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  validation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_file_sha256, dataset_type),
  CHECK (valid_rows + invalid_rows + duplicate_rows + review_rows <= total_rows)
);

CREATE TABLE IF NOT EXISTS crm.import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES crm.import_batches(id) ON DELETE CASCADE,
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
  source_partition TEXT,
  source_record_id TEXT,
  row_sha256 TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  import_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    import_status IN ('pending', 'valid', 'invalid', 'duplicate', 'needs_review', 'suppressed', 'excluded')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, source_partition, source_row_number)
);

CREATE TABLE IF NOT EXISTS crm.accounts_staging (
  import_row_id UUID PRIMARY KEY REFERENCES crm.import_rows(id) ON DELETE CASCADE,
  external_account_id TEXT,
  display_name TEXT,
  normalized_name TEXT,
  normalized_domain TEXT,
  source_tier TEXT,
  industry TEXT,
  employee_count_estimate INTEGER,
  neighborhood TEXT,
  postal_code TEXT,
  city_raw TEXT,
  source_area_code TEXT,
  source_contact_count INTEGER,
  source_data_quality_score INTEGER,
  source_first_row INTEGER,
  country_code TEXT,
  city TEXT,
  proposed_account_id UUID REFERENCES crm.accounts(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (
    match_status IN ('unmatched', 'exact', 'possible', 'new', 'invalid')
  )
);

CREATE TABLE IF NOT EXISTS crm.contacts_staging (
  import_row_id UUID PRIMARY KEY REFERENCES crm.import_rows(id) ON DELETE CASCADE,
  external_contact_id TEXT,
  external_account_id TEXT,
  company_name_raw TEXT,
  full_name TEXT,
  normalized_name TEXT,
  normalized_email TEXT,
  normalized_phone TEXT,
  source_area_code TEXT,
  source_lead_priority_score INTEGER,
  review_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  consent_status TEXT NOT NULL DEFAULT 'unknown' CHECK (
    consent_status IN ('unknown', 'explicit_opt_in', 'opted_out', 'suppressed')
  ),
  proposed_contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
  proposed_account_id UUID REFERENCES crm.accounts(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (
    match_status IN ('unmatched', 'exact', 'possible', 'new', 'invalid', 'suppressed')
  )
);

CREATE TABLE IF NOT EXISTS crm.suppressions_staging (
  import_row_id UUID PRIMARY KEY REFERENCES crm.import_rows(id) ON DELETE CASCADE,
  external_suppression_id TEXT,
  identifier_type TEXT CHECK (identifier_type IN ('email', 'phone', 'whatsapp')),
  normalized_identifier TEXT,
  reason TEXT,
  occurred_at TIMESTAMPTZ,
  source_sender TEXT,
  proposed_suppression_id UUID REFERENCES crm.suppressions(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (
    match_status IN ('unmatched', 'exact', 'new', 'invalid')
  )
);

CREATE TABLE IF NOT EXISTS crm.dedupe_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_row_id UUID NOT NULL REFERENCES crm.import_rows(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account', 'contact', 'suppression')),
  candidate_table TEXT NOT NULL CHECK (candidate_table IN ('crm.accounts', 'crm.contacts', 'crm.suppressions', 'staging')),
  candidate_id UUID,
  rule_key TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('exact', 'high', 'possible')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolution TEXT NOT NULL DEFAULT 'pending' CHECK (
    resolution IN ('pending', 'same_record', 'different_record', 'exclude', 'defer')
  ),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (import_row_id, candidate_table, candidate_id, rule_key)
);

CREATE TABLE IF NOT EXISTS crm.import_batch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES crm.import_batches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_import_batches_status_idx ON crm.import_batches (status, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_import_rows_status_idx ON crm.import_rows (batch_id, import_status);
CREATE INDEX IF NOT EXISTS crm_import_rows_hash_idx ON crm.import_rows (batch_id, row_sha256);
CREATE INDEX IF NOT EXISTS crm_accounts_staging_domain_idx ON crm.accounts_staging (normalized_domain);
CREATE INDEX IF NOT EXISTS crm_contacts_staging_email_idx ON crm.contacts_staging (normalized_email);
CREATE INDEX IF NOT EXISTS crm_contacts_staging_phone_idx ON crm.contacts_staging (normalized_phone);
CREATE INDEX IF NOT EXISTS crm_dedupe_candidates_pending_idx ON crm.dedupe_candidates (import_row_id) WHERE resolution = 'pending';

ALTER TABLE crm.import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.accounts_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.contacts_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.suppressions_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.dedupe_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.import_batch_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE crm.import_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.import_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.import_rows FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.accounts_staging FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.contacts_staging FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.suppressions_staging FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.dedupe_candidates FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.import_batch_events FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'import_sources', 'import_batches', 'import_rows', 'accounts_staging',
    'contacts_staging', 'suppressions_staging', 'dedupe_candidates', 'import_batch_events'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE crm.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE crm.%I TO service_role', table_name);
    EXECUTE format('GRANT SELECT ON TABLE crm.%I TO authenticated', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON crm.%I FOR SELECT TO authenticated USING (crm.is_admin(auth.uid()))',
      table_name || '_admin_read', table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION crm.stage_dry_run_batch(
  p_source_key TEXT,
  p_source_display_name TEXT,
  p_batch_name TEXT,
  p_source_file_name TEXT,
  p_source_file_sha256 TEXT,
  p_dataset_type TEXT,
  p_rows JSONB,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  source_uuid UUID;
  batch_uuid UUID;
  row_item JSONB;
  row_uuid UUID;
  normalized JSONB;
  row_count INTEGER;
BEGIN
  IF p_dataset_type NOT IN ('accounts', 'contacts', 'suppressions', 'needs_review') THEN
    RAISE EXCEPTION 'unsupported_dataset_type';
  END IF;
  IF p_source_file_sha256 !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid_source_checksum';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'rows_must_be_array';
  END IF;
  row_count := jsonb_array_length(p_rows);
  IF row_count < 1 OR row_count > 500 THEN
    RAISE EXCEPTION 'batch_size_out_of_range';
  END IF;

  INSERT INTO crm.import_sources (source_key, display_name)
  VALUES (p_source_key, p_source_display_name)
  ON CONFLICT (source_key) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO source_uuid;

  INSERT INTO crm.import_batches (
    source_id, batch_name, source_file_name, source_file_sha256,
    dataset_type, mode, status, total_rows, created_by
  ) VALUES (
    source_uuid, p_batch_name, p_source_file_name, p_source_file_sha256,
    p_dataset_type, 'dry_run', 'validating', row_count, p_created_by
  )
  ON CONFLICT (source_id, source_file_sha256, dataset_type) DO NOTHING
  RETURNING id INTO batch_uuid;

  IF batch_uuid IS NULL THEN
    SELECT id INTO batch_uuid
    FROM crm.import_batches
    WHERE source_id = source_uuid
      AND source_file_sha256 = p_source_file_sha256
      AND dataset_type = p_dataset_type;
    RETURN batch_uuid;
  END IF;

  FOR row_item IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    normalized := COALESCE(row_item->'normalized', '{}'::jsonb);
    INSERT INTO crm.import_rows (
      batch_id, source_row_number, source_partition, source_record_id,
      row_sha256, raw_payload, normalized_payload,
      validation_errors, validation_warnings, import_status
    ) VALUES (
      batch_uuid,
      (row_item->>'source_row_number')::INTEGER,
      NULLIF(row_item->>'source_partition', ''),
      NULLIF(row_item->>'source_record_id', ''),
      row_item->>'row_sha256',
      row_item->'raw',
      normalized,
      COALESCE(row_item->'errors', '[]'::jsonb),
      COALESCE(row_item->'warnings', '[]'::jsonb),
      row_item->>'status'
    ) RETURNING id INTO row_uuid;

    IF p_dataset_type = 'accounts' THEN
      INSERT INTO crm.accounts_staging (
        import_row_id, external_account_id, display_name, normalized_name,
        normalized_domain, country_code, city, match_status
      ) VALUES (
        row_uuid, normalized->>'external_account_id', normalized->>'display_name',
        normalized->>'normalized_name', normalized->>'normalized_domain',
        normalized->>'country_code', normalized->>'city',
        CASE WHEN row_item->>'status' = 'invalid' THEN 'invalid'
             WHEN row_item->>'status' = 'duplicate' THEN 'exact'
             WHEN row_item->>'status' = 'needs_review' THEN 'possible'
             ELSE 'new' END
      );
    ELSIF p_dataset_type IN ('contacts', 'needs_review') THEN
      INSERT INTO crm.contacts_staging (
        import_row_id, external_contact_id, external_account_id, full_name,
        normalized_name, normalized_email, normalized_phone, consent_status,
        review_reasons, match_status
      ) VALUES (
        row_uuid, normalized->>'external_contact_id', normalized->>'external_account_id',
        normalized->>'full_name', normalized->>'normalized_name', normalized->>'normalized_email',
        normalized->>'normalized_phone', COALESCE(normalized->>'consent_status', 'unknown'),
        COALESCE(row_item->'warnings', '[]'::jsonb),
        CASE WHEN row_item->>'status' = 'invalid' THEN 'invalid'
             WHEN row_item->>'status' = 'suppressed' THEN 'suppressed'
             WHEN row_item->>'status' = 'duplicate' THEN 'exact'
             WHEN p_dataset_type = 'needs_review' OR row_item->>'status' = 'needs_review' THEN 'possible'
             ELSE 'new' END
      );
    ELSE
      INSERT INTO crm.suppressions_staging (
        import_row_id, external_suppression_id, identifier_type,
        normalized_identifier, reason, occurred_at, source_sender, match_status
      ) VALUES (
        row_uuid, NULLIF(row_item->>'source_record_id', ''), normalized->>'identifier_type',
        normalized->>'normalized_identifier', normalized->>'reason',
        NULLIF(normalized->>'occurred_at', '')::TIMESTAMPTZ, normalized->>'source_sender',
        CASE WHEN row_item->>'status' = 'invalid' THEN 'invalid'
             WHEN row_item->>'status' = 'duplicate' THEN 'exact'
             ELSE 'new' END
      );
    END IF;
  END LOOP;

  UPDATE crm.import_batches SET
    status = 'review_ready',
    valid_rows = (SELECT count(*) FROM crm.import_rows WHERE batch_id = batch_uuid AND import_status = 'valid'),
    invalid_rows = (SELECT count(*) FROM crm.import_rows WHERE batch_id = batch_uuid AND import_status = 'invalid'),
    duplicate_rows = (SELECT count(*) FROM crm.import_rows WHERE batch_id = batch_uuid AND import_status = 'duplicate'),
    review_rows = (SELECT count(*) FROM crm.import_rows WHERE batch_id = batch_uuid AND import_status IN ('needs_review', 'suppressed')),
    updated_at = now()
  WHERE id = batch_uuid;

  INSERT INTO crm.import_batch_events (batch_id, event_type, actor_id, details)
  VALUES (batch_uuid, 'dry_run_staged', p_created_by, jsonb_build_object('row_count', row_count));

  RETURN batch_uuid;
END;
$$;

REVOKE ALL ON FUNCTION crm.stage_dry_run_batch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.stage_dry_run_batch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID)
  TO service_role;

CREATE OR REPLACE FUNCTION public.crm_import_batch_summaries(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_dataset_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  batch_name TEXT,
  dataset_type TEXT,
  status TEXT,
  mode TEXT,
  total_rows INTEGER,
  valid_rows INTEGER,
  invalid_rows INTEGER,
  duplicate_rows INTEGER,
  review_rows INTEGER,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
BEGIN
  IF NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 100 OR p_offset < 0 THEN
    RAISE EXCEPTION 'invalid_pagination';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN (
    'created', 'validating', 'review_ready', 'rejected',
    'approved_for_future_import', 'failed', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'invalid_status_filter';
  END IF;
  IF p_dataset_type IS NOT NULL AND p_dataset_type NOT IN (
    'accounts', 'contacts', 'suppressions', 'needs_review'
  ) THEN
    RAISE EXCEPTION 'invalid_dataset_filter';
  END IF;

  RETURN QUERY
  SELECT
    batch.id,
    batch.batch_name,
    batch.dataset_type,
    batch.status,
    batch.mode,
    batch.total_rows,
    batch.valid_rows,
    batch.invalid_rows,
    batch.duplicate_rows,
    batch.review_rows,
    batch.created_at,
    count(*) OVER () AS total_count
  FROM crm.import_batches AS batch
  WHERE (p_status IS NULL OR batch.status = p_status)
    AND (p_dataset_type IS NULL OR batch.dataset_type = p_dataset_type)
  ORDER BY batch.created_at DESC, batch.id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_import_batch_summaries(INTEGER, INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_import_batch_summaries(INTEGER, INTEGER, TEXT, TEXT)
  TO authenticated, service_role;
