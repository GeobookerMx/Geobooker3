-- CRM 360 ingestion foundation.
--
-- Additive and inert: creates no adapters, moves no legacy rows, promotes no
-- contacts, and sends no messages. It requires the workspace foundation.

DO $$
BEGIN
  IF to_regclass('crm.workspaces') IS NULL THEN
    RAISE EXCEPTION 'crm_workspace_foundation_required';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS crm.ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  source_system TEXT NOT NULL CHECK (source_system ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  adapter_version TEXT NOT NULL,
  run_mode TEXT NOT NULL DEFAULT 'reconcile' CHECK (run_mode IN ('dry_run', 'reconcile', 'import')),
  run_status TEXT NOT NULL DEFAULT 'created' CHECK (
    run_status IN ('created', 'running', 'review_ready', 'completed', 'failed', 'cancelled')
  ),
  source_cursor TEXT,
  source_high_watermark TIMESTAMPTZ,
  discovered_count INTEGER NOT NULL DEFAULT 0 CHECK (discovered_count >= 0),
  accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  rejected_count INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at),
  CHECK (accepted_count + duplicate_count + review_count + rejected_count <= discovered_count)
);

CREATE TABLE IF NOT EXISTS crm.source_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  ingestion_run_id UUID REFERENCES crm.ingestion_runs(id) ON DELETE SET NULL,
  source_system TEXT NOT NULL CHECK (source_system ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  source_event_id TEXT,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  source_record_type TEXT NOT NULL,
  source_record_id TEXT,
  event_kind TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  payload_classification TEXT NOT NULL CHECK (
    payload_classification IN (
      'aggregate', 'business_public', 'contact_personal', 'message_content',
      'consent', 'suppression', 'commercial_event'
    )
  ),
  raw_payload JSONB,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  contains_personal_data BOOLEAN NOT NULL DEFAULT FALSE,
  purge_raw_payload_after TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (
    processing_status IN ('received', 'normalized', 'duplicate', 'needs_review', 'accepted', 'rejected', 'failed')
  ),
  last_error_code TEXT,
  occurred_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_system, idempotency_key),
  CHECK (NOT contains_personal_data OR raw_payload IS NULL OR purge_raw_payload_after IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS crm.source_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  source_system TEXT NOT NULL CHECK (source_system ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  crm_entity_type TEXT NOT NULL CHECK (
    crm_entity_type IN (
      'account', 'contact', 'contact_point', 'conversation', 'message',
      'activity', 'campaign', 'opportunity', 'suppression'
    )
  ),
  crm_entity_id UUID,
  match_method TEXT NOT NULL CHECK (
    match_method IN ('external_id', 'exact_email', 'exact_phone', 'exact_domain', 'probable', 'manual')
  ),
  match_confidence NUMERIC(5, 4) CHECK (match_confidence IS NULL OR match_confidence BETWEEN 0 AND 1),
  resolution_status TEXT NOT NULL DEFAULT 'needs_review' CHECK (
    resolution_status IN ('linked', 'needs_review', 'ignored', 'superseded')
  ),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_system, source_entity_type, source_entity_id, crm_entity_type),
  CHECK (resolution_status <> 'linked' OR (crm_entity_id IS NOT NULL AND resolved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS crm.ingestion_reconciliation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  ingestion_run_id UUID REFERENCES crm.ingestion_runs(id) ON DELETE SET NULL,
  source_system TEXT NOT NULL,
  source_relation TEXT NOT NULL,
  source_count BIGINT NOT NULL CHECK (source_count >= 0),
  event_count BIGINT NOT NULL CHECK (event_count >= 0),
  linked_count BIGINT NOT NULL CHECK (linked_count >= 0),
  review_count BIGINT NOT NULL CHECK (review_count >= 0),
  rejected_count BIGINT NOT NULL CHECK (rejected_count >= 0),
  duplicate_count BIGINT NOT NULL CHECK (duplicate_count >= 0),
  reconciliation_status TEXT NOT NULL CHECK (
    reconciliation_status IN ('balanced', 'difference_expected', 'needs_review', 'failed')
  ),
  notes TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_ingestion_runs_workspace_timeline_idx
  ON crm.ingestion_runs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_ingestion_runs_source_status_idx
  ON crm.ingestion_runs (workspace_id, source_system, run_status, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_source_events_processing_idx
  ON crm.source_events (workspace_id, processing_status, received_at);
CREATE INDEX IF NOT EXISTS crm_source_events_record_idx
  ON crm.source_events (workspace_id, source_system, source_record_type, source_record_id);
CREATE INDEX IF NOT EXISTS crm_source_events_raw_retention_idx
  ON crm.source_events (purge_raw_payload_after)
  WHERE raw_payload IS NOT NULL AND purge_raw_payload_after IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_source_entity_links_target_idx
  ON crm.source_entity_links (workspace_id, crm_entity_type, crm_entity_id);
CREATE INDEX IF NOT EXISTS crm_source_entity_links_review_idx
  ON crm.source_entity_links (workspace_id, resolution_status, created_at)
  WHERE resolution_status = 'needs_review';
CREATE INDEX IF NOT EXISTS crm_ingestion_reconciliation_timeline_idx
  ON crm.ingestion_reconciliation_snapshots (workspace_id, measured_at DESC);

ALTER TABLE crm.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.ingestion_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.source_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.source_events FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.source_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.source_entity_links FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.ingestion_reconciliation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.ingestion_reconciliation_snapshots FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.ingestion_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE crm.source_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE crm.source_entity_links FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE crm.ingestion_reconciliation_snapshots FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE crm.ingestion_runs TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.source_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.source_entity_links TO service_role;
GRANT SELECT, INSERT ON TABLE crm.ingestion_reconciliation_snapshots TO service_role;

REVOKE DELETE ON TABLE crm.ingestion_runs FROM service_role;
REVOKE DELETE ON TABLE crm.source_events FROM service_role;
REVOKE DELETE ON TABLE crm.source_entity_links FROM service_role;
REVOKE UPDATE, DELETE ON TABLE crm.ingestion_reconciliation_snapshots FROM service_role;

DROP TRIGGER IF EXISTS set_updated_at ON crm.ingestion_runs;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.ingestion_runs
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON crm.source_events;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.source_events
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON crm.source_entity_links;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.source_entity_links
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

CREATE OR REPLACE FUNCTION public.crm_ingestion_360_status(
  p_workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS TABLE (
  source_system TEXT,
  total_events BIGINT,
  accepted_events BIGINT,
  duplicate_events BIGINT,
  review_events BIGINT,
  failed_events BIGINT,
  linked_entities BIGINT,
  latest_event_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
BEGIN
  IF NOT crm.has_workspace_access(p_workspace_id, ARRAY['owner', 'admin', 'manager', 'analyst']) THEN
    RAISE EXCEPTION 'workspace_access_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH event_rollup AS (
    SELECT
      event.source_system,
      count(*)::bigint AS total_events,
      count(*) FILTER (WHERE event.processing_status = 'accepted')::bigint AS accepted_events,
      count(*) FILTER (WHERE event.processing_status = 'duplicate')::bigint AS duplicate_events,
      count(*) FILTER (WHERE event.processing_status = 'needs_review')::bigint AS review_events,
      count(*) FILTER (WHERE event.processing_status = 'failed')::bigint AS failed_events,
      max(event.received_at) AS latest_event_at
    FROM crm.source_events event
    WHERE event.workspace_id = p_workspace_id
    GROUP BY event.source_system
  ), link_rollup AS (
    SELECT link.source_system, count(*) FILTER (WHERE link.resolution_status = 'linked')::bigint AS linked_entities
    FROM crm.source_entity_links link
    WHERE link.workspace_id = p_workspace_id
    GROUP BY link.source_system
  )
  SELECT
    events.source_system,
    events.total_events,
    events.accepted_events,
    events.duplicate_events,
    events.review_events,
    events.failed_events,
    COALESCE(links.linked_entities, 0),
    events.latest_event_at
  FROM event_rollup events
  LEFT JOIN link_rollup links ON links.source_system = events.source_system
  ORDER BY events.source_system;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_ingestion_360_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_ingestion_360_status(UUID) TO authenticated, service_role;

COMMENT ON TABLE crm.source_events IS
  'Private idempotent intake ledger for CRM 360 adapters. Raw personal payloads require an explicit purge date.';
COMMENT ON TABLE crm.source_entity_links IS
  'Workspace-scoped source-to-CRM identity links; probable matches remain review-only.';
COMMENT ON TABLE crm.ingestion_reconciliation_snapshots IS
  'Append-only count evidence used to prove zero-loss ingestion without exposing source rows.';
COMMENT ON FUNCTION public.crm_ingestion_360_status(UUID) IS
  'Workspace-authorized aggregate ingestion health; returns no payload or personal data.';
