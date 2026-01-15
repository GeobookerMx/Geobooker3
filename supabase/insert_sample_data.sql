-- ============================================================
-- DATOS DE MUESTRA PARA CRM (10,000 contactos)
-- ============================================================
-- Ejecutar este script para tener datos inmediatos y empezar a probar

-- Generar 10,000 contactos de muestra
-- Distribución: 5% AAA, 15% AA, 40% A, 40% B

INSERT INTO marketing_contacts (
  company_name,
  contact_name,
  email,
  phone,
  tier,
  category,
  city,
  assigned_email_sender,
  source
)
SELECT 
  -- Nombre de empresa
  CASE 
    WHEN i <= 500 THEN 'Corporativo ' || 'Empresa AAA ' || i || ' S.A. DE C.V.'
    WHEN i <= 2000 THEN 'Grupo ' || 'Empresa AA ' || i || ' S.A.'
    WHEN i <= 6000 THEN 'PyME ' || 'Empresa A ' || i
    ELSE 'Negocio ' || 'Empresa B ' || i
  END as company_name,
  
  -- Nombre de contacto
  'Contacto ' || i as contact_name,
  
  -- Email (único)
  CASE 
    WHEN i <= 500 THEN 'contacto' || i || '@empresa-aaa.com.mx'
    WHEN i <= 2000 THEN 'ventas' || i || '@empresa-aa.com.mx'
    WHEN i <= 6000 THEN 'info' || i || '@empresa-a.com.mx'
    ELSE 'contacto' || i || '@negocio-b.com'
  END as email,
  
  -- Teléfono
  '+52' || (5500000000 + i::BIGINT)::TEXT as phone,
  
  -- Tier
  CASE 
    WHEN i <= 500 THEN 'AAA'
    WHEN i <= 2000 THEN 'AA'
    WHEN i <= 6000 THEN 'A'
    ELSE 'B'
  END as tier,
  
  -- Categoría
  CASE 
    WHEN i <= 500 THEN 'Tecnología'
    WHEN i <= 1000 THEN 'Finanzas'
    WHEN i <= 2000 THEN 'Manufactura'
    WHEN i <= 4000 THEN 'Comercio'
    WHEN i <= 6000 THEN 'Restaurante'
    WHEN i <= 8000 THEN 'Retail'
    ELSE 'Servicios'
  END as category,
  
  -- Ciudad (México)
  CASE (i % 10)
    WHEN 0 THEN 'CDMX'
    WHEN 1 THEN 'Guadalajara'
    WHEN 2 THEN 'Monterrey'
    WHEN 3 THEN 'Puebla'
    WHEN 4 THEN 'Querétaro'
    WHEN 5 THEN 'Tijuana'
    WHEN 6 THEN 'León'
    WHEN 7 THEN 'Mérida'
    WHEN 8 THEN 'Cancún'
    ELSE 'Aguascalientes'
  END as city,
  
  -- Asignar cuenta
  CASE 
    WHEN i <= 2000 THEN 'ventasgeobooker@gmail.com'  -- AAA + AA
    ELSE 'geobookerr@gmail.com'  -- A + B
  END as assigned_email_sender,
  
  'sample_data_2026_01_15' as source

FROM generate_series(1, 10000) as i;

-- Ver estadísticas de lo insertado
SELECT 
  '✅ DATOS DE MUESTRA INSERTADOS' as status,
  COUNT(*) as total_contactos,
  COUNT(CASE WHEN tier = 'AAA' THEN 1 END) as tier_aaa,
  COUNT(CASE WHEN tier = 'AA' THEN 1 END) as tier_aa,
  COUNT(CASE WHEN tier = 'A' THEN 1 END) as tier_a,
  COUNT(CASE WHEN tier = 'B' THEN 1 END) as tier_b
FROM marketing_contacts
WHERE source = 'sample_data_2026_01_15';

-- Ver distribución por cuenta
SELECT 
  assigned_email_sender as cuenta,
  COUNT(*) as contactos_asignados,
  STRING_AGG(DISTINCT tier, ', ' ORDER BY tier) as tiers
FROM marketing_contacts
WHERE source = 'sample_data_2026_01_15'
GROUP BY assigned_email_sender;

-- Ver ejemplos
SELECT 
  company_name,
  contact_name,
  email,
  phone,
  tier,
  category,
  city,
  assigned_email_sender
FROM marketing_contacts
WHERE source = 'sample_data_2026_01_15'
ORDER BY tier, id
LIMIT 20;
