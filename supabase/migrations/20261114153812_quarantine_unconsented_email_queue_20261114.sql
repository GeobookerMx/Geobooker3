-- Keep the existing queue for audit while preventing an automatic send to
-- contacts without verified, explicit marketing opt-in.
BEGIN;

UPDATE public.email_queue AS queue
SET status = 'failed',
    error_message = 'Marketing email paused: no verified explicit opt-in'
FROM public.marketing_contacts AS contact
WHERE queue.contact_id = contact.id
  AND queue.status = 'pending'
  AND (
    contact.email_marketing_allowed IS DISTINCT FROM TRUE
    OR contact.email_marketing_basis IS DISTINCT FROM 'explicit_opt_in'
    OR contact.email_consented_at IS NULL
    OR NULLIF(BTRIM(contact.email_consent_evidence_ref), '') IS NULL
    OR contact.email_unsubscribed IS TRUE
  );

COMMIT;
