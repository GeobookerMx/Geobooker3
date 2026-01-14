-- ==========================================================
-- SCRAPING HISTORY - Auto-save scraped leads
-- Stores all leads scraped for future reference
-- ==========================================================

-- Create table for scraping history
CREATE TABLE IF NOT EXISTS scraping_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Lead info
    name TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    category TEXT,
    rating DECIMAL(2,1),
    review_count INT,
    google_maps_url TEXT,
    
    -- Search metadata
    search_query TEXT,
    search_location TEXT,
    tier TEXT DEFAULT 'B',
    
    -- Tracking
    source TEXT DEFAULT 'apify',
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    imported_to_crm BOOLEAN DEFAULT FALSE,
    contacted_via TEXT, -- 'whatsapp', 'email', null
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraping_history_scraped ON scraping_history(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_history_search ON scraping_history(search_query, search_location);
CREATE INDEX IF NOT EXISTS idx_scraping_history_phone ON scraping_history(phone);
CREATE INDEX IF NOT EXISTS idx_scraping_history_email ON scraping_history(email);

-- RLS Policies
ALTER TABLE scraping_history ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admin full access to scraping_history" ON scraping_history;
CREATE POLICY "Admin full access to scraping_history" ON scraping_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- Prevent duplicate phone numbers per search
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraping_history_unique_phone 
ON scraping_history(phone, search_query, search_location)
WHERE phone IS NOT NULL;

-- View for recent scrapes summary
CREATE OR REPLACE VIEW scraping_summary AS
SELECT 
    search_query,
    search_location,
    COUNT(*) as total_leads,
    COUNT(phone) as with_phone,
    COUNT(email) as with_email,
    SUM(CASE WHEN imported_to_crm THEN 1 ELSE 0 END) as imported,
    MAX(scraped_at) as last_scraped
FROM scraping_history
GROUP BY search_query, search_location
ORDER BY last_scraped DESC;

-- Grant access
GRANT SELECT, INSERT, UPDATE ON scraping_history TO authenticated;
GRANT SELECT ON scraping_summary TO authenticated;

SELECT 'scraping_history table created' as status;
