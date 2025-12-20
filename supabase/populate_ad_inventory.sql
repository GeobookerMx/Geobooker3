-- ==========================================================
-- POPULATE AD INVENTORY SLOTS
-- Uses EXISTING table structure from ad_inventory_analytics.sql
-- Columns: level, location_code, location_name, max_concurrent_ads, price_usd_per_month
-- ==========================================================

-- Clear and repopulate (removes old data)
DELETE FROM ad_inventory_slots;

-- ==================================
-- 1. GLOBAL SLOTS (5 total)
-- ==================================
INSERT INTO ad_inventory_slots (level, location_code, location_name, max_concurrent_ads, price_usd_per_month)
VALUES ('global', 'GLOBAL', 'Worldwide', 5, 25000);

-- ==================================
-- 2. REGIONAL SLOTS (5 per region)
-- ==================================
INSERT INTO ad_inventory_slots (level, location_code, location_name, max_concurrent_ads, price_usd_per_month)
VALUES 
    ('region', 'LATAM', 'Latin America', 5, 15000),
    ('region', 'NA', 'North America', 5, 18000),
    ('region', 'EU', 'Europe', 5, 18000),
    ('region', 'ASIA', 'Asia Pacific', 5, 15000),
    ('region', 'MEA', 'Middle East & Africa', 5, 12000);

-- ==================================
-- 3. COUNTRY SLOTS (5 per country)
-- ==================================
INSERT INTO ad_inventory_slots (level, location_code, location_name, max_concurrent_ads, price_usd_per_month)
VALUES 
    -- North America
    ('country', 'US', 'United States', 5, 8000),
    ('country', 'CA', 'Canada', 5, 6000),
    ('country', 'MX', 'Mexico', 5, 5000),
    
    -- Latin America
    ('country', 'BR', 'Brazil', 5, 5000),
    ('country', 'AR', 'Argentina', 5, 4000),
    ('country', 'CO', 'Colombia', 5, 4000),
    ('country', 'CL', 'Chile', 5, 4000),
    ('country', 'PE', 'Peru', 5, 3500),
    ('country', 'EC', 'Ecuador', 5, 3000),
    
    -- Europe
    ('country', 'ES', 'Spain', 5, 6000),
    ('country', 'FR', 'France', 5, 7000),
    ('country', 'DE', 'Germany', 5, 8000),
    ('country', 'GB', 'United Kingdom', 5, 8000),
    ('country', 'IT', 'Italy', 5, 6000),
    ('country', 'NL', 'Netherlands', 5, 5000),
    ('country', 'PT', 'Portugal', 5, 4000),
    ('country', 'PL', 'Poland', 5, 4000),
    ('country', 'CH', 'Switzerland', 5, 7000),
    ('country', 'BE', 'Belgium', 5, 4500),
    
    -- Asia
    ('country', 'JP', 'Japan', 5, 8000),
    ('country', 'KR', 'South Korea', 5, 6000),
    ('country', 'CN', 'China', 5, 8000),
    ('country', 'IN', 'India', 5, 5000),
    ('country', 'TH', 'Thailand', 5, 4000),
    ('country', 'SG', 'Singapore', 5, 5000),
    
    -- Middle East
    ('country', 'AE', 'UAE', 5, 6000),
    ('country', 'SA', 'Saudi Arabia', 5, 5000),
    
    -- Oceania
    ('country', 'AU', 'Australia', 5, 6000),
    ('country', 'NZ', 'New Zealand', 5, 4000);

-- ==================================
-- 4. CITY SLOTS (3 per city)
-- ==================================

-- Mexico Cities (Primary Market)
INSERT INTO ad_inventory_slots (level, location_code, location_name, max_concurrent_ads, price_usd_per_month)
VALUES 
    ('city', 'MX-CDMX', 'Mexico City', 3, 2500),
    ('city', 'MX-GDL', 'Guadalajara', 3, 1500),
    ('city', 'MX-MTY', 'Monterrey', 3, 1500),
    ('city', 'MX-CUN', 'Cancún', 3, 2000),
    ('city', 'MX-TIJ', 'Tijuana', 3, 1200),
    ('city', 'MX-PVR', 'Puerto Vallarta', 3, 1500),
    ('city', 'MX-MER', 'Mérida', 3, 1200),
    ('city', 'MX-QRO', 'Querétaro', 3, 1200),
    ('city', 'MX-OAX', 'Oaxaca', 3, 1000),
    ('city', 'MX-PBC', 'Puebla', 3, 1000);

-- USA Major Cities
INSERT INTO ad_inventory_slots (level, location_code, location_name, max_concurrent_ads, price_usd_per_month)
VALUES 
    ('city', 'US-NYC', 'New York', 3, 5000),
    ('city', 'US-LA', 'Los Angeles', 3, 4500),
    ('city', 'US-CHI', 'Chicago', 3, 3500),
    ('city', 'US-MIA', 'Miami', 3, 4000),
    ('city', 'US-SF', 'San Francisco', 3, 4500),
    ('city', 'US-LV', 'Las Vegas', 3, 3500),
    ('city', 'US-HOU', 'Houston', 3, 3000),
    ('city', 'US-DAL', 'Dallas', 3, 3000);

-- Spain Major Cities
INSERT INTO ad_inventory_slots (level, location_code, location_name, max_concurrent_ads, price_usd_per_month)
VALUES 
    ('city', 'ES-MAD', 'Madrid', 3, 3000),
    ('city', 'ES-BCN', 'Barcelona', 3, 3000),
    ('city', 'ES-VLC', 'Valencia', 3, 2000),
    ('city', 'ES-SEV', 'Seville', 3, 1800);

-- South America Major Cities  
INSERT INTO ad_inventory_slots (level, location_code, location_name, max_concurrent_ads, price_usd_per_month)
VALUES 
    ('city', 'BR-SAO', 'São Paulo', 3, 3500),
    ('city', 'BR-RIO', 'Rio de Janeiro', 3, 3000),
    ('city', 'AR-BUE', 'Buenos Aires', 3, 2500),
    ('city', 'CO-BOG', 'Bogotá', 3, 2000),
    ('city', 'CO-MDE', 'Medellín', 3, 1800),
    ('city', 'CL-SCL', 'Santiago', 3, 2000),
    ('city', 'PE-LIM', 'Lima', 3, 1800);

-- ==================================
-- SUMMARY
-- ==================================
SELECT 
    level,
    COUNT(*) as locations,
    SUM(max_concurrent_ads) as total_slots
FROM ad_inventory_slots 
GROUP BY level
ORDER BY 
    CASE level 
        WHEN 'global' THEN 1 
        WHEN 'region' THEN 2 
        WHEN 'country' THEN 3 
        WHEN 'city' THEN 4 
    END;
