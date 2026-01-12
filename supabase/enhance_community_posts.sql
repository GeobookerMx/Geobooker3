-- ==========================================================
-- ENHANCE COMMUNITY POSTS
-- Adds support for multiple images and external links
-- ==========================================================

ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]';

COMMENT ON COLUMN community_posts.images IS 'Array of image URLs for the post gallery';
COMMENT ON COLUMN community_posts.external_links IS 'Array of objects [{label: string, url: string}] for external resources';

-- Verify
SELECT 'Community posts enhanced successfully!' as message;
