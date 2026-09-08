const SOURCE_DEFINITIONS = Object.freeze({
  apify: Object.freeze({
    relation: 'scraping_history',
    sourceSystem: 'apify',
    recordType: 'business_lead',
    eventKind: 'business_discovered',
    classification: 'business_public',
    containsPersonalData: true
  }),
  scan_local: Object.freeze({
    relation: 'scan_leads',
    sourceSystem: 'scan_local',
    recordType: 'business_lead',
    eventKind: 'business_discovered',
    classification: 'business_public',
    containsPersonalData: false
  }),
  csv: Object.freeze({
    relation: 'marketing_contacts',
    sourceSystem: 'csv_legacy',
    recordType: 'contact',
    eventKind: 'legacy_contact_snapshot',
    classification: 'contact_personal',
    containsPersonalData: true
  }),
  email_queue: Object.freeze({
    relation: 'email_queue',
    sourceSystem: 'email_queue_legacy',
    recordType: 'queued_message',
    eventKind: 'email_queue_snapshot',
    classification: 'commercial_event',
    containsPersonalData: false
  }),
  email_history: Object.freeze({
    relation: 'campaign_history',
    sourceSystem: 'email_history_legacy',
    recordType: 'message_activity',
    eventKind: 'email_activity_snapshot',
    classification: 'commercial_event',
    containsPersonalData: false
  })
});

const SAFE_TEXT_FIELDS = Object.freeze([
  'company_name', 'name', 'category', 'industry', 'city', 'state', 'country',
  'country_code', 'website', 'domain', 'place_id', 'tier', 'source', 'status'
]);

const SAFE_BOOLEAN_FIELDS = Object.freeze([
  'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed',
  'response_received', 'imported_to_crm', 'is_active'
]);

const TIMESTAMP_FIELDS = Object.freeze([
  'updated_at', 'sent_at', 'scheduled_for', 'scraped_at', 'captured_at',
  'import_date', 'created_at'
]);

export function getIngestionSourceDefinition(source) {
  return SOURCE_DEFINITIONS[String(source || '')] || null;
}

export function listIngestionSources() {
  return Object.keys(SOURCE_DEFINITIONS);
}

export function sourceFilter(source, query) {
  if (source === 'apify') return query.eq('source', 'apify');
  if (source === 'csv') return query.ilike('source', '%csv%');
  if (source === 'email_history') return query.eq('campaign_type', 'email');
  return query;
}

function compactText(value, maximumLength = 300) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, maximumLength) : null;
}

function firstTimestamp(record) {
  for (const field of TIMESTAMP_FIELDS) {
    if (!record[field]) continue;
    const parsed = new Date(record[field]);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

export function normalizeLegacySourceRecord(source, record) {
  const definition = getIngestionSourceDefinition(source);
  if (!definition || !record || typeof record !== 'object' || Array.isArray(record)) return null;

  const sourceRecordId = compactText(record.id, 200);
  if (!sourceRecordId) return null;

  const normalized = {};
  for (const field of SAFE_TEXT_FIELDS) {
    const value = compactText(record[field]);
    if (value !== null) normalized[field] = value;
  }
  for (const field of SAFE_BOOLEAN_FIELDS) {
    if (typeof record[field] === 'boolean') normalized[field] = record[field];
  }

  normalized.has_email = Boolean(compactText(record.email));
  normalized.has_phone = Boolean(compactText(record.phone));
  normalized.has_contact = Boolean(record.contact_id);

  return {
    definition,
    sourceRecordId,
    occurredAt: firstTimestamp(record),
    normalized
  };
}

export function buildIngestionEvent({
  workspaceId,
  ingestionRunId,
  source,
  record,
  payloadSha256,
  idempotencyKey
}) {
  const prepared = normalizeLegacySourceRecord(source, record);
  if (!prepared) return null;

  return {
    workspace_id: workspaceId,
    ingestion_run_id: ingestionRunId,
    source_system: prepared.definition.sourceSystem,
    source_event_id: null,
    idempotency_key: idempotencyKey,
    source_record_type: prepared.definition.recordType,
    source_record_id: prepared.sourceRecordId,
    event_kind: prepared.definition.eventKind,
    payload_sha256: payloadSha256,
    payload_classification: prepared.definition.classification,
    raw_payload: null,
    normalized_payload: prepared.normalized,
    contains_personal_data: prepared.definition.containsPersonalData,
    purge_raw_payload_after: null,
    processing_status: 'needs_review',
    occurred_at: prepared.occurredAt
  };
}

