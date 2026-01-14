-- ==========================================================
-- AGREGAR MÁS CIUDADES AL INVENTARIO ENTERPRISE
-- ==========================================================
-- Ejecutar en Supabase SQL Editor
-- Esto agrega nuevas ciudades de los países existentes y nuevos países

-- ==========================================================
-- PASO 1: CREAR TABLA SI NO EXISTE
-- ==========================================================
CREATE TABLE IF NOT EXISTS enterprise_ad_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL DEFAULT 'city', -- global, region, country, city
    location_name TEXT NOT NULL,
    location_code TEXT UNIQUE NOT NULL,
    price_usd NUMERIC DEFAULT 1000,
    max_slots INTEGER DEFAULT 3,
    available_slots INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_enterprise_slots_level ON enterprise_ad_slots(level);
CREATE INDEX IF NOT EXISTS idx_enterprise_slots_active ON enterprise_ad_slots(is_active);

-- ==========================================================
-- PASO 2: INSERTAR DATOS BASE (Global, Regiones, Países)
-- ==========================================================
INSERT INTO enterprise_ad_slots (level, location_name, location_code, price_usd, max_slots, available_slots)
VALUES 
    ('global', 'Global Coverage', 'GLOBAL', 25000, 5, 5),
    ('region', 'North America', 'NA', 15000, 5, 5),
    ('region', 'Latin America', 'LATAM', 10000, 5, 5),
    ('region', 'Europe', 'EU', 12000, 5, 5),
    ('region', 'Asia Pacific', 'APAC', 12000, 5, 5),
    ('country', 'Mexico', 'MX', 5000, 5, 5),
    ('country', 'USA', 'US', 8000, 5, 5),
    ('country', 'Spain', 'ES', 5000, 5, 5),
    ('country', 'Brazil', 'BR', 6000, 5, 5),
    ('country', 'Colombia', 'CO', 4000, 5, 5),
    ('country', 'Argentina', 'AR', 4500, 5, 5)
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================================
-- PASO 3: CIUDADES ORIGINALES (las que ya tenías)
-- ==========================================================
INSERT INTO enterprise_ad_slots (level, location_name, location_code, price_usd, max_slots, available_slots)
VALUES 
    ('city', 'Mexico City', 'MX-CDMX', 2500, 3, 3),
    ('city', 'Guadalajara', 'MX-GDL', 1500, 3, 3),
    ('city', 'Monterrey', 'MX-MTY', 1500, 3, 3),
    ('city', 'Puebla', 'MX-PUE', 1000, 3, 3),
    ('city', 'Cancún', 'MX-CUN', 2000, 3, 3),
    ('city', 'Mérida', 'MX-MID', 1200, 3, 3),
    ('city', 'Oaxaca', 'MX-OAX', 1000, 3, 3),
    ('city', 'Puerto Vallarta', 'MX-PVR', 1500, 3, 3),
    ('city', 'Querétaro', 'MX-QRO', 1200, 3, 3),
    ('city', 'Tijuana', 'MX-TIJ', 1200, 3, 3),
    ('city', 'New York', 'US-NYC', 5000, 3, 3),
    ('city', 'Los Angeles', 'US-LAX', 4500, 3, 3),
    ('city', 'Miami', 'US-MIA', 4000, 3, 3),
    ('city', 'Chicago', 'US-CHI', 3500, 3, 3),
    ('city', 'Houston', 'US-HOU', 3000, 3, 3),
    ('city', 'Dallas', 'US-DFW', 3000, 3, 3),
    ('city', 'San Francisco', 'US-SFO', 4500, 3, 3),
    ('city', 'Las Vegas', 'US-LAS', 3500, 3, 3),
    ('city', 'Madrid', 'ES-MAD', 3000, 3, 3),
    ('city', 'Barcelona', 'ES-BCN', 3000, 3, 3),
    ('city', 'Valencia', 'ES-VLC', 2000, 3, 3),
    ('city', 'Seville', 'ES-SVQ', 1800, 3, 3),
    ('city', 'Buenos Aires', 'AR-BUE', 2500, 3, 3),
    ('city', 'Bogotá', 'CO-BOG', 2000, 3, 3),
    ('city', 'Medellín', 'CO-MDE', 1800, 3, 3),
    ('city', 'Cartagena', 'CO-CTG', 1800, 3, 3),
    ('city', 'Lima', 'PE-LIM', 1800, 3, 3),
    ('city', 'Santiago', 'CL-SCL', 2000, 3, 3),
    ('city', 'São Paulo', 'BR-SAO', 3500, 3, 3),
    ('city', 'Rio de Janeiro', 'BR-RIO', 3000, 3, 3)
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================================
-- PASO 4: NUEVAS CIUDADES DE MÉXICO
-- ==========================================================
INSERT INTO enterprise_ad_slots (level, location_name, location_code, price_usd, max_slots, available_slots)
VALUES 
    ('city', 'Aguascalientes', 'MX-AGU', 1000, 3, 3),
    ('city', 'León', 'MX-LEO', 1200, 3, 3),
    ('city', 'San Luis Potosí', 'MX-SLP', 1000, 3, 3),
    ('city', 'Toluca', 'MX-TOL', 1000, 3, 3),
    ('city', 'Chihuahua', 'MX-CHI', 1000, 3, 3),
    ('city', 'Hermosillo', 'MX-HMO', 1000, 3, 3),
    ('city', 'Saltillo', 'MX-SAL', 900, 3, 3),
    ('city', 'Morelia', 'MX-MOR', 900, 3, 3),
    ('city', 'Veracruz', 'MX-VER', 1000, 3, 3),
    ('city', 'Acapulco', 'MX-ACA', 1200, 3, 3),
    ('city', 'Los Cabos', 'MX-CAB', 1500, 3, 3),
    ('city', 'Mazatlán', 'MX-MAZ', 1000, 3, 3),
    ('city', 'Cuernavaca', 'MX-CUE', 900, 3, 3),
    ('city', 'Tuxtla Gutiérrez', 'MX-TGZ', 800, 3, 3),
    ('city', 'Villahermosa', 'MX-VHM', 800, 3, 3)
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================================
-- NUEVAS CIUDADES DE USA
-- ==========================================================
INSERT INTO enterprise_ad_slots (level, location_name, location_code, price_usd, max_slots, available_slots)
VALUES 
    ('city', 'Phoenix', 'US-PHX', 3000, 3, 3),
    ('city', 'Seattle', 'US-SEA', 3500, 3, 3),
    ('city', 'Denver', 'US-DEN', 3000, 3, 3),
    ('city', 'Boston', 'US-BOS', 3500, 3, 3),
    ('city', 'Atlanta', 'US-ATL', 3000, 3, 3),
    ('city', 'Austin', 'US-AUS', 3000, 3, 3),
    ('city', 'San Diego', 'US-SAN', 3500, 3, 3),
    ('city', 'Orlando', 'US-ORL', 2800, 3, 3),
    ('city', 'San Antonio', 'US-SAT', 2500, 3, 3),
    ('city', 'Philadelphia', 'US-PHL', 3000, 3, 3),
    ('city', 'Washington DC', 'US-WDC', 4000, 3, 3),
    ('city', 'Nashville', 'US-BNA', 2500, 3, 3),
    ('city', 'Portland', 'US-PDX', 2800, 3, 3),
    ('city', 'Minneapolis', 'US-MSP', 2500, 3, 3),
    ('city', 'Detroit', 'US-DTW', 2200, 3, 3)
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================================
-- NUEVAS CIUDADES DE ESPAÑA
-- ==========================================================
INSERT INTO enterprise_ad_slots (level, location_name, location_code, price_usd, max_slots, available_slots)
VALUES 
    ('city', 'Bilbao', 'ES-BIO', 2000, 3, 3),
    ('city', 'Málaga', 'ES-AGP', 2000, 3, 3),
    ('city', 'Zaragoza', 'ES-ZAZ', 1800, 3, 3),
    ('city', 'Alicante', 'ES-ALC', 1500, 3, 3),
    ('city', 'Palma de Mallorca', 'ES-PMI', 2500, 3, 3),
    ('city', 'Granada', 'ES-GRX', 1500, 3, 3),
    ('city', 'Las Palmas', 'ES-LPA', 1800, 3, 3),
    ('city', 'San Sebastián', 'ES-EAS', 2000, 3, 3)
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================================
-- NUEVAS CIUDADES DE LATINOAMÉRICA
-- ==========================================================
INSERT INTO enterprise_ad_slots (level, location_name, location_code, price_usd, max_slots, available_slots)
VALUES 
    -- Colombia
    ('city', 'Cali', 'CO-CAL', 1500, 3, 3),
    ('city', 'Barranquilla', 'CO-BAQ', 1200, 3, 3),
    
    -- Argentina
    ('city', 'Córdoba', 'AR-COR', 1800, 3, 3),
    ('city', 'Rosario', 'AR-ROS', 1500, 3, 3),
    ('city', 'Mendoza', 'AR-MDZ', 1500, 3, 3),
    
    -- Chile
    ('city', 'Valparaíso', 'CL-VAL', 1500, 3, 3),
    ('city', 'Concepción', 'CL-CCP', 1200, 3, 3),
    
    -- Perú
    ('city', 'Cusco', 'PE-CUS', 1500, 3, 3),
    ('city', 'Arequipa', 'PE-AQP', 1200, 3, 3),
    
    -- Brasil
    ('city', 'Brasília', 'BR-BSB', 2500, 3, 3),
    ('city', 'Salvador', 'BR-SSA', 2000, 3, 3),
    ('city', 'Fortaleza', 'BR-FOR', 1800, 3, 3),
    ('city', 'Recife', 'BR-REC', 1800, 3, 3),
    ('city', 'Porto Alegre', 'BR-POA', 2000, 3, 3),
    ('city', 'Curitiba', 'BR-CWB', 2000, 3, 3),
    ('city', 'Belo Horizonte', 'BR-CNF', 2200, 3, 3)
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================================
-- NUEVOS PAÍSES (Europa)
-- ==========================================================
INSERT INTO enterprise_ad_slots (level, location_name, location_code, price_usd, max_slots, available_slots)
VALUES 
    -- Francia
    ('city', 'Paris', 'FR-PAR', 5000, 3, 3),
    ('city', 'Lyon', 'FR-LYS', 2500, 3, 3),
    ('city', 'Marseille', 'FR-MRS', 2500, 3, 3),
    ('city', 'Nice', 'FR-NCE', 2800, 3, 3),
    
    -- Italia
    ('city', 'Roma', 'IT-ROM', 4500, 3, 3),
    ('city', 'Milan', 'IT-MXP', 4500, 3, 3),
    ('city', 'Florencia', 'IT-FLR', 3000, 3, 3),
    ('city', 'Venecia', 'IT-VCE', 3500, 3, 3),
    ('city', 'Nápoles', 'IT-NAP', 2000, 3, 3),
    
    -- Alemania
    ('city', 'Berlín', 'DE-BER', 4500, 3, 3),
    ('city', 'Múnich', 'DE-MUC', 4000, 3, 3),
    ('city', 'Frankfurt', 'DE-FRA', 3500, 3, 3),
    ('city', 'Hamburgo', 'DE-HAM', 3000, 3, 3),
    
    -- Reino Unido
    ('city', 'London', 'UK-LON', 6000, 3, 3),
    ('city', 'Manchester', 'UK-MAN', 3500, 3, 3),
    ('city', 'Liverpool', 'UK-LPL', 2800, 3, 3),
    ('city', 'Edinburgh', 'UK-EDI', 3000, 3, 3),
    
    -- Portugal
    ('city', 'Lisboa', 'PT-LIS', 3000, 3, 3),
    ('city', 'Porto', 'PT-OPO', 2500, 3, 3),
    
    -- Países Bajos
    ('city', 'Ámsterdam', 'NL-AMS', 4000, 3, 3),
    ('city', 'Rotterdam', 'NL-RTM', 2500, 3, 3)
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================================
-- NUEVOS PAÍSES (Asia y Oceanía)
-- ==========================================================
INSERT INTO enterprise_ad_slots (level, location_name, location_code, price_usd, max_slots, available_slots)
VALUES 
    ('city', 'Tokyo', 'JP-TYO', 6000, 3, 3),
    ('city', 'Osaka', 'JP-OSA', 4000, 3, 3),
    ('city', 'Sydney', 'AU-SYD', 5000, 3, 3),
    ('city', 'Melbourne', 'AU-MEL', 4500, 3, 3),
    ('city', 'Singapore', 'SG-SIN', 5000, 3, 3),
    ('city', 'Hong Kong', 'HK-HKG', 5000, 3, 3),
    ('city', 'Dubai', 'AE-DXB', 5500, 3, 3),
    ('city', 'Seoul', 'KR-SEL', 4500, 3, 3),
    ('city', 'Bangkok', 'TH-BKK', 3000, 3, 3),
    ('city', 'Mumbai', 'IN-BOM', 3500, 3, 3),
    ('city', 'Auckland', 'NZ-AKL', 3500, 3, 3)
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================================
-- VERIFICACIÓN
-- ==========================================================
SELECT level, COUNT(*) as total, SUM(max_slots) as total_slots
FROM enterprise_ad_slots
GROUP BY level
ORDER BY level;

SELECT COUNT(*) as total_locations FROM enterprise_ad_slots;

-- ==========================================================
-- PASO FINAL: CREAR/ACTUALIZAR FUNCIÓN RPC
-- ==========================================================
CREATE OR REPLACE FUNCTION get_ad_inventory_status()
RETURNS TABLE (
    level TEXT,
    location_name TEXT,
    location_code TEXT,
    price_usd NUMERIC,
    max_slots INTEGER,
    available_slots TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.level,
        e.location_name,
        e.location_code,
        e.price_usd,
        e.max_slots,
        e.available_slots::TEXT
    FROM enterprise_ad_slots e
    WHERE e.is_active = true
    ORDER BY 
        CASE e.level
            WHEN 'global' THEN 1
            WHEN 'region' THEN 2
            WHEN 'country' THEN 3
            WHEN 'city' THEN 4
        END,
        e.location_name;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- ✅ LISTO - Ejecuta y verifica los nuevos slots en el dashboard
-- ==========================================================
