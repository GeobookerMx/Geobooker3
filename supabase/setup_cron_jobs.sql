-- Supabase Cron Jobs para Automatización Diaria
-- Ejecutar estos comandos en Supabase SQL Editor

-- ============================================
-- PASO 1: Habilitar extensión pg_cron
-- ============================================

-- Verificar si pg_cron está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Si no aparece, pedir a Supabase Support que lo habilite
-- (La extensión pg_cron no está disponible en todos los planes)

-- ============================================
-- ALTERNATIVA: Usar Supabase Edge Functions
-- ============================================

-- Como pg_cron puede no estar disponible, usaremos:
-- GitHub Actions + Supabase Edge Functions

-- ARCHIVO: .github/workflows/daily-cron.yml
/*
name: Daily CRM Automation

on:
  schedule:
    # 9 AM CST (3 PM UTC) - Generación de colas
    - cron: '0 15 * * *'
    # 11 AM CST (5 PM UTC) - Envío de emails
    - cron: '0 17 * * *'

jobs:
  generate-queues:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Email Queue
        run: |
          curl -X POST https://geobooker.com.mx/.netlify/functions/generate-email-queue \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      
      - name: Generate WhatsApp Queue  
        run: |
          curl -X POST https://geobooker.com.mx/.netlify/functions/generate-whatsapp-queue \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  process-email-queue:
    runs-on: ubuntu-latest
    needs: generate-queues
    steps:
      - name: Process Email Queue
        run: |
          curl -X POST https://geobooker.com.mx/.netlify/functions/process-email-queue \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
*/

-- ============================================
-- FUNCIONES SQL (ya creadas)
-- ============================================

-- ✅ generate_daily_email_queue(limit, tier_filter)
-- ✅ generate_daily_whatsapp_queue(limit, tier_filter)
-- ✅ mark_whatsapp_sent(contact_id, queue_id)

-- ============================================
-- NETLIFY FUNCTIONS NECESARIAS
-- ============================================

-- Crear:
-- netlify/functions/generate-email-queue.js
-- netlify/functions/generate-whatsapp-queue.js

-- Ya existe:
-- ✅ netlify/functions/process-email-queue.js

-- ============================================
-- TESTING MANUAL
-- ============================================

-- Generar cola de emails manualmente:
SELECT * FROM generate_daily_email_queue(100);

-- Generar cola de WhatsApp manualmente:
SELECT * FROM generate_daily_whatsapp_queue(20);

-- Ver estado de colas:
SELECT 
    'Email' as type,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM email_queue
UNION ALL
SELECT 
    'WhatsApp' as type,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM whatsapp_queue;

-- ============================================
-- CONFIGURACIÓN DE LÍMITES DIARIOS
-- ============================================

-- Insertar configuración si no existe
INSERT INTO automation_config (campaign_type, daily_limit, active)
VALUES 
    ('email', 100, true),
    ('whatsapp', 20, true)
ON CONFLICT (campaign_type) 
DO UPDATE SET daily_limit = EXCLUDED.daily_limit;

-- Ver configuración actual
SELECT * FROM automation_config;

-- ============================================
-- REPORTES AUTOMÁTICOS
-- ============================================

-- Crear vista para reporte diario
CREATE OR REPLACE VIEW daily_campaign_report AS
SELECT 
    DATE(sent_at) as fecha,
    campaign_type as canal,
    COUNT(*) as total_enviados,
    COUNT(*) FILTER (WHERE status = 'sent') as exitosos,
    COUNT(*) FILTER (WHERE status = 'failed') as fallidos,
    ROUND(COUNT(*) FILTER (WHERE status = 'sent')::numeric / COUNT(*)::numeric * 100, 2) as tasa_exito
FROM campaign_history
WHERE sent_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(sent_at), campaign_type
ORDER BY fecha DESC;

-- Ver reporte
SELECT * FROM daily_campaign_report LIMIT 7;

-- ============================================
-- PRÓXIMOS PASOS
-- ============================================

/*
1. Crear Netlify Functions faltantes
2. Configurar GitHub Actions
3. Agregar CRON_SECRET a GitHub Secrets
4. Probar workflow manualmente
5. Activar schedule automático
*/
