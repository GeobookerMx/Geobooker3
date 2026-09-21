# Geobooker — WhatsApp Template Submission Pack P0

Fecha: 2026-09-14

Uso: alta manual en WhatsApp Manager para el WABA productivo de Geobooker y
sincronización posterior desde WhatsApp Center.

## Configuración común

- Header: ninguno en la primera versión.
- Footer: `Geobooker` cuando Meta lo permita; no agregar promesas ni precios.
- Variables: únicamente texto corto y verificable.
- URLs: botones estáticos oficiales, nunca secretos ni IDs internos.
- Marketing: sólo con opt-in comprobable para esa finalidad.
- Utility: sólo como respuesta/continuación de una acción realmente solicitada.
- Baja: `BAJA` en español y `STOP` en inglés.
- Mantener `WHATSAPP_SEND_ENABLED=false` durante creación y aprobación.

Meta puede reclasificar una plantilla. Si lo hace, no intentar ocultar contenido
promocional bajo Utility: se acepta la categoría correcta y se actualizan los
gates del CRM.

## Español — es_MX

### 1. gb_optin_confirm_es_mx

- Categoría sugerida: `UTILITY`
- Body: `Hola {{1}}, confirmamos tu solicitud para recibir informacion de Geobooker relacionada con {{2}} por WhatsApp. Puedes responder BAJA en cualquier momento.`
- Ejemplos: `{{1}} = Ana`; `{{2}} = Cafeteria Central`
- Botón: ninguno
- Uso: después de formulario, QR, landing, Click-to-WhatsApp o solicitud explícita con evidencia.

### 2. gb_business_registration_help_es_mx

- Categoría sugerida: `UTILITY`
- Body: `Hola {{1}}, recibimos tu solicitud para continuar el registro o reclamo de {{2}} en Geobooker. Completa la informacion desde el boton. Si necesitas ayuda, responde a este mensaje.`
- Ejemplos: `{{1}} = Ana`; `{{2}} = Cafeteria Central`
- Botón URL: `Continuar registro`
- URL: `https://geobooker.com.mx/claim`
- Uso: sólo si la persona inició o solicitó registro/reclamo.

### 3. gb_ads_requested_info_es_mx

- Categoría sugerida: `UTILITY`
- Body: `Hola {{1}}, recibimos tu solicitud de informacion sobre opciones de publicidad de Geobooker para {{2}}. Puedes consultar el panorama inicial desde el boton o responder para recibir apoyo.`
- Ejemplos: `{{1}} = Carlos`; `{{2}} = Marca Ejemplo en Mexico`
- Botón URL: `Ver opciones`
- URL: `https://geobooker.com.mx/advertise`
- Uso: únicamente después de una solicitud de Ads o Enterprise.

### 4. gb_business_invitation_es_mx

- Categoría: `MARKETING`
- Body: `Hola {{1}}, conoce como registrar o reclamar {{2}} en Geobooker para mantener visible su informacion comercial. Revisa los pasos desde el boton. Puedes responder BAJA para dejar de recibir novedades.`
- Ejemplos: `{{1}} = Ana`; `{{2}} = Cafeteria Central`
- Botón URL: `Registrar negocio`
- URL: `https://geobooker.com.mx/claim`
- Uso: sólo con opt-in de marketing comprobable.

### 5. gb_ads_followup_es_mx

- Categoría: `MARKETING`
- Body: `Hola {{1}}, tenemos opciones de visibilidad para empresas interesadas en llegar a {{2}}. Conoce Geobooker Ads desde el boton o responde si deseas que revisemos tu objetivo. Puedes responder BAJA en cualquier momento.`
- Ejemplos: `{{1}} = Carlos`; `{{2}} = Ciudad de Mexico`
- Botón URL: `Conocer Geobooker Ads`
- URL: `https://geobooker.com.mx/advertise`
- Uso: sólo con opt-in vigente, mercado aprobado y frequency cap.

### 6. gb_app_download_es_mx

- Categoría: `MARKETING`
- Body: `Hola {{1}}, descubre negocios y servicios cercanos con Geobooker. Consulta las opciones oficiales para usar o descargar la aplicacion desde el boton. Puedes responder BAJA para dejar de recibir novedades.`
- Ejemplo: `{{1}} = Ana`
- Botón URL: `Descargar Geobooker`
- URL: `https://geobooker.com.mx/download`
- Uso: sólo con opt-in de marketing o interés de descarga registrado.

## English — en_US

### 7. gb_optin_confirm_en_us

- Suggested category: `UTILITY`
- Body: `Hi {{1}}, this confirms your request to receive Geobooker information related to {{2}} via WhatsApp. You can reply STOP at any time.`
- Examples: `{{1}} = Alex`; `{{2}} = Example Coffee`
- Button: none

### 8. gb_business_registration_help_en_us

- Suggested category: `UTILITY`
- Body: `Hi {{1}}, we received your request to continue the registration or claim for {{2}} on Geobooker. Complete the information using the button. Reply if you need help.`
- Examples: `{{1}} = Alex`; `{{2}} = Example Coffee`
- URL button: `Continue registration`
- URL: `https://geobooker.com.mx/claim`

### 9. gb_ads_requested_info_en_us

- Suggested category: `UTILITY`
- Body: `Hi {{1}}, we received your request for information about Geobooker advertising options for {{2}}. Review the initial overview using the button or reply for assistance.`
- Examples: `{{1}} = Alex`; `{{2}} = Example Brand in Mexico`
- URL button: `View options`
- URL: `https://geobooker.com.mx/advertise`

### 10. gb_business_invitation_en_us

- Category: `MARKETING`
- Body: `Hi {{1}}, discover how to register or claim {{2}} on Geobooker and keep its business information visible. Review the steps using the button. Reply STOP to stop receiving updates.`
- Examples: `{{1}} = Alex`; `{{2}} = Example Coffee`
- URL button: `Register business`
- URL: `https://geobooker.com.mx/claim`

### 11. gb_ads_followup_en_us

- Category: `MARKETING`
- Body: `Hi {{1}}, Geobooker has visibility options for companies interested in reaching {{2}}. Explore Geobooker Ads using the button or reply if you would like us to review your goal. Reply STOP at any time.`
- Examples: `{{1}} = Alex`; `{{2}} = United States and Mexico`
- URL button: `Explore Geobooker Ads`
- URL: `https://geobooker.com.mx/advertise`

### 12. gb_app_download_en_us

- Category: `MARKETING`
- Body: `Hi {{1}}, discover nearby businesses and services with Geobooker. View the official ways to use or download the app using the button. Reply STOP to stop receiving updates.`
- Example: `{{1}} = Alex`
- URL button: `Download Geobooker`
- URL: `https://geobooker.com.mx/download`

## No usar estas plantillas para

- teléfonos provenientes únicamente de CSV, scraping, INEGI, DENUE, Overture o
  directorios públicos;
- consentimiento `unknown`, baja, suppression, número inválido o país bloqueado;
- campañas sin presupuesto, aprobación y frequency cap;
- promesas de ventas, reuniones, descargas o resultados garantizados.

## Gate después de Meta

1. Esperar estado `APPROVED` de cada plantilla.
2. Ejecutar `Sync from Meta` en WhatsApp Center.
3. Confirmar `12/12` y `TEMPLATE GATE PASS`.
4. Si alguna queda `REJECTED`, `PAUSED` o es reclasificada, no habilitarla en campañas.
5. Mantener envíos desactivados hasta completar consentimiento y presupuesto.
