-- ==========================================================
-- Tier AAA "Hook" Template & WhatsApp Integration
-- ==========================================================

-- 0. Fix schema if needed
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'promotional';

-- 1. Insert the "Hook" template for Tier AAA
INSERT INTO email_templates (name, subject, body_html, template_type) VALUES
(
    'Alianza Estratégica AAA - Geobooker',
    'Propuesta de Alianza Estratégica: {{empresa}} + Geobooker',
    '
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <p>Estimado(a) <strong>{{nombre}}</strong>,</p>
        
        <p>Le escribo porque he seguido de cerca la trayectoria de <strong>{{empresa}}</strong> y me ha impresionado su posicionamiento en el sector.</p>
        
        <p>Mi nombre es Juan Pablo y soy el director de <strong>Geobooker</strong>, la plataforma de búsqueda de negocios que está transformando la visibilidad digital en México. Estamos seleccionando a un grupo exclusivo de empresas "Tier AAA" para una alianza estratégica que busca maximizar su impacto ante nuestra audiencia creciente.</p>
        
        <p>Me gustaría invitarle a una breve charla de 10 minutos para presentarle cómo <strong>{{empresa}}</strong> puede aparecer de forma destacada en nuestros mapas inteligentes y qué beneficios exclusivos tenemos para líderes de industria como ustedes.</p>
        
        <p>¿Tendría disponibilidad esta semana para una breve llamada o videollamada?</p>
        
        <p>Quedo atento a su respuesta.</p>
        <br>
        <p>Atentamente,</p>
    </div>
    ',
    'promotional'
) ON CONFLICT DO NOTHING;

-- 2. Ensure crm_contacts has wait_until for re-engagement
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0;

-- 3. Update comments to explain re-engagement logic
COMMENT ON COLUMN crm_contacts.email_sent IS 'True if the first email campaign has been sent';
COMMENT ON COLUMN crm_contacts.last_contacted_at IS 'Timestamp of the last successful communication attempt';

SELECT 'Tier AAA template created and schema updated for re-engagement' as status;
