# Auditoria 360 del CRM de Geobooker

Fecha de auditoria: 2026-06-14

## Resumen ejecutivo

El CRM propio de Geobooker si existe en codigo y esta concentrado principalmente en [src/pages/admin/UnifiedCRM.jsx](/C:/Users/juanpablo/Geobooker3/src/pages/admin/UnifiedCRM.jsx), con apoyo de [src/components/admin/MarketingDashboard.jsx](/C:/Users/juanpablo/Geobooker3/src/components/admin/MarketingDashboard.jsx), [src/components/admin/WhatsAppCRM.jsx](/C:/Users/juanpablo/Geobooker3/src/components/admin/WhatsAppCRM.jsx) y varios scripts SQL en `supabase/`.

Hoy el sistema es una mezcla de funciones reales, funciones semiautomatizadas y funciones que dependen de infraestructura externa para operar de verdad.

## Como funciona el CRM desde 0

1. La base de datos de prospeccion vive sobre `marketing_contacts`.
2. Los contactos se cargan desde CSV/XLSX dentro del CRM admin.
3. El admin puede segmentar por tier, ciudad, estado, industria y tipo.
4. El CRM permite crear y editar plantillas de email en `email_templates`.
5. Las colas de outreach se apoyan en `email_queue`, `whatsapp_queue`, `campaign_history`, `crm_settings` y funciones RPC.
6. El envio por email usa Netlify Functions y Resend.
7. El envio por WhatsApp no es totalmente automatico: genera cola y abre WhatsApp con mensaje prellenado, pero el disparo final sigue siendo manual.
8. El dashboard admin general vive en [src/pages/admin/DashboardHome.jsx](/C:/Users/juanpablo/Geobooker3/src/pages/admin/DashboardHome.jsx) y el CRM especializado en `/admin/crm`.

## Que si esta automatizado

- Importacion de contactos a `marketing_contacts`.
- Preparacion de cola de email via `generate_daily_email_queue` y variantes SQL.
- Procesamiento automatizado de `email_queue` via `process-email-queue.js`.
- Envio de notificaciones transaccionales via `send-notification-email.js`.
- Recepcion de eventos de Resend via `resend-webhook.js`.
- Registro de pagos Stripe y OXXO via `stripe-webhook.js`.
- Insercion de leads enterprise y B2B en `enterprise_leads`.

## Que no esta totalmente automatizado

- WhatsApp comercial: el sistema abre mensajes prellenados, pero no usa por ahora la API oficial de Meta para envio automatico server-to-server.
- Parte del CRM depende de RPCs, tablas, webhooks o variables de entorno que deben existir en Supabase/Netlify.
- Algunas promesas del area enterprise y publicidad son comerciales y de presentacion, no siempre respaldadas por flujo self-service activo.

## Correo: realidad actual

- Existe integracion con Resend.
- El limite visible en producto es 100 emails por dia.
- El envio real depende de `RESEND_API_KEY` y despliegue correcto de funciones Netlify.
- El webhook de Resend contempla `sent`, `delivered`, `opened`, `clicked`, `bounced` y `complained`.
- Riesgo detectado y corregido: la preparacion de cola desde `generate-email-queue.js` no estaba insertando nada en `email_queue`; ahora usa el RPC que si persiste la cola.

## WhatsApp: realidad actual

- Hay dos capas principales: `WhatsAppCRM.jsx` y `whatsappService.js`.
- El sistema normaliza numeros, detecta idioma y arma mensajes.
- Si lleva conteos diarios y separa nacional/global.
- Operativamente es un flujo asistido: seleccion, cola, apertura de WhatsApp, envio humano y luego registro en base.

## Dashboard admin: si manda correos

Si, pero con matices:

- Aprobaciones de negocios disparan emails transaccionales si existe `RESEND_API_KEY`.
- Campanas CRM por email usan Netlify y Resend.
- El dashboard muestra metricas de enviados y pendientes.
- Si faltan variables o funciones desplegadas, la UI puede verse funcional sin enviar realmente.

## Publicidad / monetizacion

### Lo que si funciona en codigo

- Catalogo publico de espacios en [src/pages/AdvertisePage.jsx](/C:/Users/juanpablo/Geobooker3/src/pages/AdvertisePage.jsx).
- Wizard de creacion de campana en [src/pages/ad-wizard/CampaignCreateWizard.jsx](/C:/Users/juanpablo/Geobooker3/src/pages/ad-wizard/CampaignCreateWizard.jsx).
- Upload de creativos a `ad-creatives`.
- Checkout Stripe y OXXO.
- Webhook que marca campanas pagadas.
- Dashboard de anunciante en [src/pages/advertiser/AdvertiserDashboard.jsx](/C:/Users/juanpablo/Geobooker3/src/pages/advertiser/AdvertiserDashboard.jsx).
- Reporte enterprise por RPC (`get_campaign_report`, `get_campaign_daily_metrics`).

### Riesgos y huecos

- Parte de enterprise checkout ya esta bloqueado y redirige a contacto, asi que no es un self-service enterprise realmente activo.
- Varias metricas visibles en landings son aspiracionales o comerciales.
- Habia un bug en el boton rapido de PDF que seguia usando tablas antiguas (`ad_purchases`, `ad_impressions`); se corrigio para usar el modelo actual.

## Storage e imagenes

Antigravity detecto bien un problema real: coexistian referencias a `business-images` y `business images`.

Revision:

- Reclamos de negocio usan `business-images`.
- Logos y galeria usan `business-assets`.
- Recomendaciones usan `recommendations`.
- Creativos de anuncios usan `ad-creatives`.

Observacion:

- El SQL de correccion agrega ambos buckets como compatibilidad. Eso reduce fallas, pero deja deuda tecnica hasta converger todo a un solo nombre definitivo.

## B2B Proveedores

La funcion `/proveedores` o `/b2b-connect` si existe y guarda leads en `enterprise_leads`.

### Lo que hoy hace realmente

- Presenta oferta B2B.
- Captura empresa, correo, audiencia objetivo y mensaje.
- Inserta lead con `lead_type: b2b_connect`.
- Ofrece WhatsApp y correo directo.

### Lo que no hace por si sola

- No lanza automaticamente una campana outbound al enviar el formulario.
- No orquesta todavia un pipeline completo de onboarding, scoring, cotizacion y seguimiento B2B dentro de una sola vista especializada.

## Revision de cambios de Antigravity

### Acertado

- Ajuste comercial de precios de lanzamiento.
- Proteccion de iOS y Android para no vender anuncios de forma riesgosa dentro de wrappers nativos.
- Deteccion del conflicto de buckets.
- Cambio de enterprise a cotizacion en lugar de precio publico alto.

### A revisar con cuidado

- El build local no confirma por si mismo que Resend, Stripe, webhooks, RPCs y politicas Supabase esten correctas en produccion.
- La pagina B2B y enterprise siguen mezclando discurso comercial con capacidad operativa parcial.

## Cambios aplicados durante esta auditoria

1. Se corrigio `netlify/functions/generate-email-queue.js` para que use el RPC que si persiste registros en `email_queue`.
2. Se corrigio `src/services/reportService.js` para usar las tablas y RPCs vigentes del sistema publicitario actual.
3. Se agrego un aviso visible en el CRM admin para distinguir que canales son automaticos y cuales siguen siendo manuales o asistidos.

## Conclusiones claras

- El CRM de Geobooker si es real y ya tiene una base funcional seria.
- No esta 100% automatizado.
- Email esta mas cerca de una automatizacion real que WhatsApp.
- WhatsApp hoy es semiautomatico.
- B2B Proveedores si captura leads, pero aun no es una maquina completa de ventas B2B end-to-end.
- El admin dashboard si puede mandar correos, siempre que la infraestructura externa este bien configurada.
- La parte de Ads ya puede sostener una fase piloto de monetizacion, pero todavia hay que validar produccion real de Stripe, Supabase RPCs y reportes contra datos reales antes de escalar agresivamente.
