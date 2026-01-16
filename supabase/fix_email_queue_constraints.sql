-- Fix: Make queue fields nullable to allow flexible queue generation
-- Only contact_id, priority, and status are required; everything else can be assigned later

ALTER TABLE email_queue 
ALTER COLUMN assigned_sender DROP NOT NULL;

ALTER TABLE email_queue 
ALTER COLUMN scheduled_for DROP NOT NULL;

COMMENT ON COLUMN email_queue.assigned_sender IS 'Email sender to use (can be assigned later during sending)';
COMMENT ON COLUMN email_queue.scheduled_for IS 'When to send (can be assigned later, defaults to NOW)';
