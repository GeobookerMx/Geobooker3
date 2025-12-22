-- ==========================================================
-- BUSINESS VISIBILITY TOGGLE
-- Allows business owners to show/hide their business on the map
-- ==========================================================

-- Add is_visible column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN businesses.is_visible IS 
'Toggle for business visibility on map. When false, business won''t appear in map searches. Controlled by owner.';

-- Update any existing businesses to be visible by default
UPDATE businesses SET is_visible = true WHERE is_visible IS NULL;

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_businesses_is_visible ON businesses(is_visible);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' AND column_name = 'is_visible';
