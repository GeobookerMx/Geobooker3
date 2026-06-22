# CRM Status Report - 2026-06-22

## Estado actual

Se revisaron cuatro frentes principales del CRM de Geobooker:

1. Cola de 100 correos en Unified CRM.
2. Envio de secuencia a n8n desde Unified CRM.
3. WhatsApp Local desde Scan & Invite.
4. WhatsApp Global desde Lead Scraper Global.

## 1. Error de cola de 100 correos

Error reportado:
- Could not find a relationship between 'email_queue' and 'marketing_contacts' in the schema cache

Diagnostico:
- El frontend dependia de un select relacional entre email_queue y marketing_contacts.
- Si Supabase no tiene fresca esa relacion en schema cache, el CRM falla aunque los datos existan.

Estado:
- Corregido en codigo.
- El CRM ahora consulta email_queue por separado y luego trae marketing_contacts en otra consulta.
- Ya no depende de esa relacion cacheada.

Archivo afectado:
- src/pages/admin/UnifiedCRM.jsx

## 2. Enviar Secuencia N8N

Comportamiento actual del boton:
- El admin selecciona contactos en Unified CRM.
- Debe elegir una plantilla.
- Debe elegir un remitente.
- Puede escribir un custom_message opcional.

Que manda ahora el CRM a n8n:
- Datos del contacto.
- Subject procesado de la plantilla.
- HTML base procesado.
- rendered_html final con layout profesional Geobooker.
- Firma del remitente.
- Nombre y correo del remitente.
- Tipo y nombre de plantilla.

Conclusiones operativas:
- No tienes que escribir manualmente todo el correo cada vez.
- El contenido principal sale de la plantilla seleccionada en el CRM.
- El texto que pongas en el modal de n8n es solo un complemento en custom_message.
- Para que salga lo mas profesional posible, n8n debe usar email_payload.rendered_html como cuerpo final.

## 3. Error WhatsApp Local

Pantalla:
- Scan & Invite

Error reportado:
- Error al enviar WhatsApp: permission denied for table users

Diagnostico:
- La pantalla usa WhatsAppService.sendMessage().
- Ese servicio llama al RPC register_whatsapp_sent().
- El error no viene del boton ni del telefono.
- El error apunta a una funcion o policy vieja en Supabase que todavia depende de users o de reglas antiguas de admin/RLS.

Codigo revisado:
- src/pages/admin/ScanInvitePage.jsx
- src/services/whatsappService.js

## 4. Error WhatsApp Global

Pantalla:
- Lead Scraper Global

Error reportado:
- Error al enviar WhatsApp: permission denied for table users

Diagnostico:
- Usa exactamente el mismo servicio unificado de WhatsApp.
- Por eso el error local y global estan relacionados y deben resolverse juntos.

Codigo revisado:
- src/pages/admin/ApifyScraper.jsx
- src/services/whatsappService.js

## SQL recomendado

Existe un hotfix en el repo pensado justo para estos errores:
- supabase/fix_crm_whatsapp_email_hotfix.sql

Ese SQL hace, entre otras cosas:
- Crea private.is_admin() y public.is_admin() con SECURITY DEFINER.
- Reemplaza register_whatsapp_sent() por una version segura.
- Crea o corrige unified_whatsapp_outreach.
- Corrige generate_daily_email_queue().
- Corrige RLS para tablas CRM sin depender de lecturas inseguras.

## Acciones que debes hacer en Supabase

1. Abrir SQL Editor.
2. Ejecutar completo el archivo supabase/fix_crm_whatsapp_email_hotfix.sql
3. Verificar despues estas funciones:
- register_whatsapp_sent
- generate_daily_email_queue
- get_daily_campaign_stats
- public.is_admin
4. Probar de nuevo:
- 1 WhatsApp en Scan & Invite.
- 1 WhatsApp en Lead Scraper Global.
- 1 preparacion de cola de 100 correos en Unified CRM.

## Acciones pendientes en n8n

Para que el flujo sea profesional y estable:
1. El webhook de n8n debe recibir el payload del CRM.
2. n8n debe usar email_payload.rendered_html.
3. n8n no debe usar HTML hardcodeado viejo.
4. El remitente final debe salir de email_payload.from_name y email_payload.from_email.

## Estado de build

Verificacion local:
- npm run build paso correctamente.

## Nota de despliegue

Aun no se hizo commit ni deploy de estos cambios de hoy.
- Hay un cambio no relacionado en src/pages/enterprise/EnterpriseCheckout.jsx que no conviene mezclar sin revisarlo.
- Antes de deploy, conviene separar ese archivo o confirmar si tambien debe ir.