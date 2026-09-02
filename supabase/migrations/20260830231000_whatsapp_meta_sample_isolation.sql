-- Isolate signed Meta Developers sample payloads from commercial CRM data.

ALTER TABLE crm.webhook_events
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE crm.conversations
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS crm_conversations_test_idx
  ON crm.conversations (is_test, last_message_at DESC)
  WHERE is_test = TRUE;

COMMENT ON COLUMN crm.webhook_events.metadata IS
  'Non-payload audit classification, including signed Meta Developers sample markers.';
COMMENT ON COLUMN crm.conversations.is_test IS
  'True only for isolated provider sample/test conversations; never commercial outreach.';
