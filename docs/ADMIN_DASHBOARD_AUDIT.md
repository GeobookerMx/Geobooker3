# Auditoria Admin Dashboard Geobooker

Fecha: 2026-06-15

## Resumen ejecutivo

El dashboard administrador de Geobooker ya tiene una base funcional amplia, pero no todo opera con el mismo nivel de automatizacion. La parte mas madura hoy es:

- CRM unificado con contactos, segmentacion y preparacion de colas
- Email con Resend desde funciones Netlify
- WhatsApp operativo en modo asistido/manual
- Captacion de leads locales y globales
- Publicidad Geobooker Ads con gestion administrativa

Las areas donde habia mas confusion estaban en:

- diferencia entre preparar cola y enviar de verdad
- alias de rutas del CRM (`/admin/marketing`, `/admin/campaigns`, `/admin/crm`)
- limites internos de WhatsApp vs limites oficiales de Meta
- expectativa de que n8n "envia" por si solo, cuando en realidad depende del workflow

## Modulos admin detectados

Rutas principales registradas en `src/router.jsx`:

- `/admin/dashboard`: vista general y KPIs
- `/admin/businesses`: negocios
- `/admin/users`: usuarios
- `/admin/ads`: Geobooker Ads
- `/admin/ads-qa`: QA de anuncios
- `/admin/reports`: reportes de negocios
- `/admin/ad-reports`: reportes de anuncios
- `/admin/analytics`: analitica
- `/admin/revenue`: ingresos
- `/admin/inventory`: inventario publicitario
- `/admin/blog`: blog
- `/admin/scan-invite`: captacion local
- `/admin/settings`: configuracion
- `/admin/referrals`: referidos
- `/admin/import`: importacion
- `/admin/crm`: CRM unificado
- `/admin/security`: seguridad
- `/admin/smart-campaigns`: launcher inteligente
- `/admin/scraper`: Apify scraper global
- `/admin/scraper-history`: historial de scraping
- `/admin/fiscal`: control fiscal
- `/admin/recommendations`: recomendaciones
- `/admin/claims`: reclamos

Aliases activos:

- `/admin/marketing` redirige a `/admin/crm`
- `/admin/campaigns` redirige a `/admin/crm`

## Estado real por area

### 1. CRM unificado

Archivo principal: `src/pages/admin/UnifiedCRM.jsx`

Si funciona:

- carga contactos CRM
- segmenta por tier, origen y estatus
- prepara cola de email real consultando `email_queue`
- prepara cola de WhatsApp
- permite vista previa
- permite enviar email manual desde el dashboard
- registra logs y `message_id` cuando Resend responde

Nivel de automatizacion:

- medio

Lo automatico:

- generacion de cola por criterios
- refresco de estadisticas
- registro en historial

Lo manual:

- disparo final de envio desde el admin
- revision humana del contenido

### 2. Email CRM

Funciones involucradas:

- `netlify/functions/generate-email-queue.js`
- `netlify/functions/process-email-queue.js`
- `netlify/functions/send-notification-email.js`
- `netlify/functions/_email-branding.js`

Si funciona:

- preparar cola no envia, solo inserta pendientes
- enviar desde CRM si dispara Resend
- ya se guarda `message_id` cuando el envio viene del flujo manual del CRM
- ya existe footer profesional y bloque de branding para emails CRM
- ya pueden mostrarse QR y botones de descarga de apps en el footer

Nivel de automatizacion:

- medio a alto si se usa cola + worker
- medio si se usa solo envio manual desde dashboard

Punto critico:

- si el usuario solo presiona "Preparar Cola Real", no se envia nada hasta presionar el boton de envio

### 3. n8n

Estado real:

- n8n sirve como orquestador
- por si solo no cuenta como envio
- si el workflow en n8n usa Resend con la misma API key, esos correos si consumen el mismo limite de Resend
- si el workflow usa otro proveedor, el consumo ya no impacta a Resend

Conclusion:

- n8n es ideal para automatizar disparadores, secuencias, follow-ups y plantillas
- la capacidad final depende del proveedor de envio que use el flujo

### 4. WhatsApp

Archivos principales:

- `src/services/whatsappService.js`
- `src/components/admin/WhatsAppCRM.jsx`
- `src/pages/admin/ScanInvitePage.jsx`
- `src/pages/admin/ApifyScraper.jsx`

Estado real:

- Geobooker hoy opera WhatsApp como flujo asistido/manual
- el sistema abre WhatsApp con mensaje prellenado
- luego el humano confirma el envio en WhatsApp
- el dashboard registra y descuenta del cap interno diario

Importante:

- los topes visibles hoy son caps internos de operacion, no una cuota oficial universal de Meta
- para automatizar de verdad a escala se necesita WhatsApp Business Platform, opt-in valido y plantillas aprobadas

Nivel de automatizacion:

- bajo a medio

Lo automatico:

- seleccion de leads
- armado de cola
- deduplicacion y conteo

Lo manual:

- envio final dentro de WhatsApp

### 5. Scan Local

Archivo principal: `src/pages/admin/ScanInvitePage.jsx`

Si funciona:

- captura leads locales
- arma mensajes de invitacion
- apoya outreach por WhatsApp

Riesgo:

- depende de disciplina operativa y consentimiento
- no debe asumirse como envio masivo automatizado

### 6. Apify scraper global

Archivo principal: `src/pages/admin/ApifyScraper.jsx`

Si funciona:

- busca negocios globales
- exporta resultados
- importa leads al CRM
- permite outreach manual/asistido

Mejora aplicada:

- el texto de costos ya no promete un costo fijo por negocio; se marco como variable segun plan y consumo

### 7. Publicidad Geobooker Ads

Archivos tocados en esta auditoria previa:

- `src/pages/admin/AdvertisingManager.jsx`
- `src/services/reportService.js`

Si funciona:

- lectura del esquema actual de anuncios
- visualizacion administrativa
- reporteo consistente con el esquema vigente

## Mejoras aplicadas en esta ronda

- Sidebar admin ahora usa `/admin/crm` como ruta canonica
- Sidebar reconoce aliases de CRM para que el menu activo no se pierda
- redirects viejos de CRM/Email ya apuntan a `/admin/crm`
- cola de email ya tiene boton visible para enviar fuera del modal
- footer profesional para emails CRM con branding y QR
- texto de Apify ajustado para no prometer costos fijos
- labels de WhatsApp en Scan/Apify mas claros respecto al cap interno

## Lo que sigue en el masterplan

### Prioridad alta

- webhook de Resend para persistir entregado, abierto, bounce y complaint
- panel de trazabilidad de email por campana
- plantillas versionadas en base de datos o n8n
- mover WhatsApp de modo manual a modo API oficial solo con opt-in limpio

### Prioridad media

- header contextual en admin segun ruta
- tooltips o microcopy por boton en CRM
- auditoria por modulo con checklist de QA visible dentro del admin
- consolidar metricas de campañas en una sola vista ejecutiva

### Prioridad estrategica

- journeys automatizados en n8n: alta de lead, espera, follow-up, scoring, reasignacion
- atribucion por fuente para saber que ventas vienen de local, Apify, ads o inbound
- B2B proveedores como vertical dedicada con pipeline, etiquetas y cadencias propias

## APIs y herramientas recomendadas

No son obligatorias para operar hoy, pero si quieres escalar ventas y automatizacion:

- Resend webhook para tracking real de eventos de email
- n8n para secuencias, enrutamiento y plantillas
- WhatsApp Business Platform oficial para envios escalables y medibles
- un proveedor de analytics CRM o eventos si quieres medir conversion a venta

## Conclusiones

El admin ya esta suficientemente maduro para operar CRM y captacion, pero todavia mezcla automatizacion real con automatizacion asistida. La principal mejora de esta auditoria fue dejar mas honesto el flujo:

- preparar no es enviar
- n8n no envia solo si el workflow no lo hace
- WhatsApp actual no es bulk automation oficial
- el CRM si puede automatizarse mas, pero requiere webhooks, plantillas y canal oficial
