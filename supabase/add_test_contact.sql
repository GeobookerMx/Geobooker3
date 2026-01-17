-- Agregar contacto de prueba para verificar el sistema de emails
-- Email: vanessaholguin60@gmail.com

INSERT INTO marketing_contacts (
    contact_name,
    email,
    company_name,
    phone,
    tier,
    industry,
    city,
    state,
    country
) VALUES (
    'Vanessa Holguín',
    'vanessaholguin60@gmail.com',
    'Geobooker (Prueba)',
    '',
    'AAA',
    'Tecnología',
    'Ciudad de México',
    'CDMX',
    'México'
)
ON CONFLICT (email) DO UPDATE SET
    contact_name = EXCLUDED.contact_name,
    company_name = EXCLUDED.company_name,
    tier = EXCLUDED.tier,
    industry = EXCLUDED.industry,
    updated_at = NOW();

-- Verificar que se insertó
SELECT * FROM marketing_contacts WHERE email = 'vanessaholguin60@gmail.com';
