-- ==========================================================
-- FIX: CRM Contacts and Community Posts
-- 1. Add UNIQUE constraint on email for upsert
-- 2. Ensure external_links column exists on community_posts
-- ==========================================================

-- 1. CRM CONTACTS: Make email unique for upsert to work
-- First, remove duplicates (keep most recent)
DELETE FROM crm_contacts a
USING crm_contacts b
WHERE a.created_at < b.created_at
AND a.email = b.email
AND a.email IS NOT NULL
AND a.email != '';

-- Add unique constraint on email (only non-null, non-empty)
ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_email_unique;
CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_email_unique 
ON crm_contacts(email) 
WHERE email IS NOT NULL AND email != '';

-- 2. COMMUNITY POSTS: Ensure images and external_links columns exist
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN community_posts.images IS 'Array of image URLs for the post gallery';
COMMENT ON COLUMN community_posts.external_links IS 'Array of objects [{label: string, url: string}] for external resources';

-- Verify the columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'community_posts' 
AND column_name IN ('images', 'external_links');

-- Verify crm_contacts email index
SELECT indexname FROM pg_indexes WHERE tablename = 'crm_contacts' AND indexname LIKE '%email%';

SELECT 'SUCCESS: Both issues fixed' as status;
