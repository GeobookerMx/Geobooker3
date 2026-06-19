-- ================================================================
-- SISTEMA DE PREMIOS / RECONOCIMIENTOS PARA NEGOCIOS
-- Preparado para datasets editoriales como MICHELIN, guias locales
-- o premios propios de Geobooker.
-- ================================================================

CREATE TABLE IF NOT EXISTS business_awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    award_source TEXT NOT NULL,
    award_name TEXT NOT NULL,
    award_year INTEGER NOT NULL,
    award_level INTEGER DEFAULT 0,
    green_award BOOLEAN DEFAULT FALSE,
    first_awarded_year INTEGER,
    current_award_year INTEGER,
    source_url TEXT,
    last_verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    verification_status TEXT DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'needs_review', 'rejected')),
    badge_text TEXT,
    icon_key TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (business_id, award_source, award_name, award_year)
);

CREATE INDEX IF NOT EXISTS idx_business_awards_business ON business_awards(business_id);
CREATE INDEX IF NOT EXISTS idx_business_awards_source ON business_awards(award_source);
CREATE INDEX IF NOT EXISTS idx_business_awards_year ON business_awards(award_year DESC);
CREATE INDEX IF NOT EXISTS idx_business_awards_status ON business_awards(verification_status);

CREATE TABLE IF NOT EXISTS business_awards_import_staging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_name TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    address TEXT,
    category TEXT,
    subcategory TEXT,
    cuisine_type TEXT,
    award_year INTEGER,
    stars INTEGER,
    green_award BOOLEAN DEFAULT FALSE,
    is_new_year BOOLEAN DEFAULT FALSE,
    badge_type TEXT,
    badge_text TEXT,
    icon_key TEXT,
    search_aliases TEXT[],
    source_url TEXT,
    verification_status TEXT,
    notes TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_awards_staging_city ON business_awards_import_staging(city);
CREATE INDEX IF NOT EXISTS idx_awards_staging_year ON business_awards_import_staging(award_year DESC);

CREATE OR REPLACE VIEW business_awards_active AS
SELECT
    ba.business_id,
    ba.award_source,
    ba.award_name,
    ba.award_year,
    ba.award_level,
    ba.green_award,
    ba.current_award_year,
    ba.first_awarded_year,
    ba.source_url,
    ba.last_verified_at,
    ba.verification_status
FROM business_awards ba
WHERE ba.verification_status IN ('verified', 'pending');

