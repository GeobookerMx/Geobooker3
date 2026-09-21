# Geobooker - WhatsApp Template Submission Pack

> DEPRECATED: usar `WHATSAPP_TEMPLATE_SUBMISSION_PACK_P0_2026-09-14.md`.
> Este archivo se conserva únicamente como referencia histórica.

Fecha: 2026-09-10
Uso: copiar manualmente en WhatsApp Manager y luego sincronizar desde WhatsApp Center.

## Reglas

- Crear plantillas en el WABA productivo recomendado: `4731600213830930`.
- Mantener `WHATSAPP_SEND_ENABLED=false` hasta completar pruebas end-to-end, consentimiento, suppression y aprobacion interna.
- No usar plantillas de marketing con contactos de origen scraping, CSV o telefono publico sin opt-in verificable.
- Usar Utility solo para seguimiento solicitado, citas, confirmaciones o relacion activa.
- Respetar BAJA, ALTO, STOP y solicitudes equivalentes.

## Plantillas iniciales

### gb_optin_confirm_es_mx

- Idioma: `es_MX`
- Categoria: `UTILITY`
- Uso: confirmar consentimiento posterior a formulario, QR, landing o solicitud explicita.
- Cuerpo:

Hola {{1}}, confirmamos que deseas recibir informacion de Geobooker para {{2}} por WhatsApp. Puedes responder ALTO si no deseas continuar.

- Variables:
  - `{{1}}`: nombre
  - `{{2}}`: nombre de negocio o empresa

### gb_meeting_confirm_es_mx

- Idioma: `es_MX`
- Categoria: `UTILITY`
- Uso: confirmar reunion solicitada o aceptada.
- Cuerpo:

Hola {{1}}, confirmamos tu reunion con Geobooker para el {{2}} a las {{3}}. Si necesitas cambiarla, responde a este mensaje.

- Variables:
  - `{{1}}`: nombre
  - `{{2}}`: fecha
  - `{{3}}`: hora

### gb_proposal_followup_es_mx

- Idioma: `es_MX`
- Categoria: `UTILITY`
- Uso: seguimiento de propuesta solicitada.
- Cuerpo:

Hola {{1}}, te compartimos seguimiento de la propuesta {{2}} de Geobooker. Puedes revisarla aqui: {{3}}. Si tienes dudas, con gusto te apoyamos.

- Variables:
  - `{{1}}`: nombre
  - `{{2}}`: paquete o propuesta
  - `{{3}}`: enlace

### gb_business_ads_intro_es_mx

- Idioma: `es_MX`
- Categoria: `MARKETING`
- Uso: presentacion comercial solo con opt-in marketing comprobable.
- Cuerpo:

Hola {{1}}, en Geobooker podemos ayudarte a impulsar visibilidad y oportunidades para negocios de {{3}} en {{2}}. Si te interesa, podemos compartirte opciones.

- Variables:
  - `{{1}}`: nombre
  - `{{2}}`: ciudad o mercado
  - `{{3}}`: industria

### gb_optin_confirm_en_us

- Idioma: `en_US`
- Categoria: `UTILITY`
- Uso: consent confirmation after explicit request.
- Cuerpo:

Hi {{1}}, this confirms you asked to receive Geobooker updates for {{2}} via WhatsApp. Reply STOP if you do not want to continue.

- Variables:
  - `{{1}}`: name
  - `{{2}}`: company

### gb_global_ads_intro_en_us

- Idioma: `en_US`
- Categoria: `MARKETING`
- Uso: international advertising introduction only with documented marketing opt-in.
- Cuerpo:

Hi {{1}}, Geobooker can help businesses in {{2}} improve visibility through {{3}} campaigns. If useful, we can share a short overview.

- Variables:
  - `{{1}}`: name
  - `{{2}}`: market
  - `{{3}}`: product or campaign type

## Prueba obligatoria despues de aprobacion

1. Click en `Sync from Meta` en WhatsApp Center.
2. Confirmar que las plantillas aparezcan como `APPROVED`.
3. Verificar que el CRM no permita usar Marketing con consentimiento `unknown`.
4. Mantener envio real desactivado hasta autorizacion final.
