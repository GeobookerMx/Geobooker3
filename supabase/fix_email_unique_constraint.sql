-- ==========================================================
-- FIX: Add proper UNIQUE constraint on crm_contacts.email
-- ==========================================================

-- First, clean up duplicate emails (keep most recent)
WITH duplicates AS (
    SELECT id, email,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
    FROM crm_contacts
    WHERE email IS NOT NULL AND email != ''
)
DELETE FROM crm_contacts
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Drop any existing partial index
DROP INDEX IF EXISTS crm_contacts_email_unique;
DROP INDEX IF EXISTS idx_crm_contacts_email;

-- Create proper unique constraint on email
ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_email_key;
ALTER TABLE crm_contacts ADD CONSTRAINT crm_contacts_email_key UNIQUE (email);

-- Verify constraint exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'crm_contacts' AND constraint_type = 'UNIQUE';

-- Also reset external_links for all posts to empty array (fixes shared links bug)
UPDATE community_posts SET external_links = '[]'::jsonb WHERE external_links IS NULL OR external_links::text = 'null';
-- Images is text[], not jsonb
UPDATE community_posts SET images = '{}' WHERE images IS NULL;

-- Show current posts and their links
SELECT id, title, external_links FROM community_posts ORDER BY created_at DESC LIMIT 10;

SELECT 'Done! Email constraint added and posts cleaned.' as status;
