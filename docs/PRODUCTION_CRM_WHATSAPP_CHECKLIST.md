# Production CRM WhatsApp Checklist

## Objetivo
Dejar en produccion una sola ruta estable para:
- limites WhatsApp nacional/global
- cola WhatsApp
- contadores del dashboard admin
- sincronizacion de leads locales y globales
- remitente real de email en CRM

## SQL a ejecutar en Supabase produccion
1. `supabase/production_crm_whatsapp_hotfix.sql`
2. `supabase/deploy_to_production.sql`
3. `supabase/actualizar_remitentes_crm.sql`

## Resultado esperado despues del SQL
- `campaign_config` debe existir con:
  - `whatsapp/google_places = 10`
  - `whatsapp/apify = 10`
  - `email/csv = 100`
- `campaign_daily_stats` debe contar por fecha Mexico
- `register_campaign_send()` debe mapear:
  - `scan_invite -> google_places`
  - `crm_queue -> csv`
- `count_whatsapp_national_today_mexico()` debe leer `scan_invite`
- `count_whatsapp_global_today_mexico()` debe leer `apify`

## Variables Netlify criticas
- `RESEND_API_KEY`
- `CRM_DEFAULT_FROM_ADDRESS=hola@geobooker.com.mx`
- `CRM_DEFAULT_FROM_NAME=Geobooker Ads`
- `CRM_REPLY_TO_EMAIL=ventasgeobooker@gmail.com`
- `RESEND_VERIFIED_DOMAIN=geobooker.com.mx`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`

## Pruebas funcionales
1. Entrar a `Scan & Invite`
2. Confirmar que muestre `enviadas/restan`
3. Enviar 1 WhatsApp nacional
4. Confirmar que suba contador nacional
5. Entrar a `Apify Scraper`
6. Confirmar que muestre `Global hoy`
7. Enviar 1 WhatsApp global
8. Confirmar que suba contador global
9. Entrar a `WhatsApp CRM`
10. Confirmar que panel muestre nacional/global coherentes
11. Entrar a `Unified CRM`
12. Preparar cola de email
13. Enviar prueba
14. Confirmar que el remitente real sea `hola@geobooker.com.mx`
15. Confirmar que el correo tenga footer, logos y QR

## Si algo falla
- Si aparece "limite alcanzado" pero no cuadra:
  - revisar `unified_whatsapp_outreach`
  - revisar `campaign_daily_stats`
  - revisar si el envio entro como `scan_invite` o `apify`
- Si no se genera cola:
  - revisar `marketing_contacts.source`
  - correr `sync_scan_leads_to_marketing()`
  - correr `sync_apify_leads_to_marketing()`
- Si email no sale:
  - revisar `RESEND_API_KEY`
  - revisar dominio verificado en Resend
  - revisar que el remitente no sea Gmail en `from`
