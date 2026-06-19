# Release Gate Geobooker - 2026-06-16

## Estado actual

Esta rama local ya quedo en condicion de candidato serio a produccion:

- Branch activa: `release_stable_2026_06_15`
- Commit mas reciente: `0d5c799` - `fix: stabilize crm email and whatsapp operations`
- Build local de produccion: `OK`
- Worktree local: limpio

## Cambios criticos ya integrados

### CRM y email

- Se unifico el remitente operativo del CRM para evitar inconsistencias entre UI, funciones Netlify y Resend.
- El remitente real quedo orientado a `hola@geobooker.com.mx`.
- `ventasgeobooker@gmail.com` queda como `reply-to` cuando aplique.
- Se corrigio la lectura de respuesta del SDK de Resend en cola de emails para guardar correctamente `message_id` y errores reales.
- Se mejoro el branding de correos para soportar footer y presentacion profesional desde una sola base.

### WhatsApp y limites diarios

- Se normalizaron las fuentes entre `scan_invite`, `google_places`, `apify`, `manual` y `crm_queue`.
- Se corrigio la logica que podia hacer parecer agotados los limites cuando realmente habia un problema de backend o de conteo.
- El admin ahora muestra mejor cuantos enviados y cuantos restantes quedan por origen.

### Leads B2B y captacion comercial

- Se corrigio el flujo `Enviar y pre-agendar proyecto` en B2B para no fallar por datos obligatorios faltantes en `enterprise_leads`.
- Se mejoro la capa comercial Geobooker + TT y la explicacion de paquetes, reporteo y espacios publicitarios.

## Lo que SI esta validado

- Compilacion de frontend para produccion con `npm run build`
- Estructura de funciones Netlify para email estabilizada
- Flujos de UI del admin ajustados para sender y conteos
- SQL de hotfix preparado para sincronizar CRM y WhatsApp en produccion

## Lo que TODAVIA no puede prometerse sin deploy real

No debemos afirmar que produccion esta estable al 100% hasta completar estas 4 acciones:

1. Subir esta rama al remoto.
2. Desplegar en Netlify con las variables correctas.
3. Ejecutar SQL en Supabase produccion.
4. Hacer smoke test real en produccion sobre CRM, emails, WhatsApp y B2B.

## Orden obligatorio para produccion

### 1. Variables de entorno Netlify

Verificar:

- `RESEND_API_KEY`
- `RESEND_VERIFIED_DOMAIN=geobooker.com.mx`
- `CRM_DEFAULT_FROM_ADDRESS=hola@geobooker.com.mx`
- `CRM_DEFAULT_FROM_NAME=Geobooker Ads`
- `CRM_REPLY_TO_EMAIL=ventasgeobooker@gmail.com`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`

### 2. SQL en Supabase produccion

Ejecutar en este orden:

1. `supabase/production_crm_whatsapp_hotfix.sql`
2. `supabase/deploy_to_production.sql`
3. `supabase/actualizar_remitentes_crm.sql`

### 3. Deploy web

- Publicar commit `0d5c799`
- Esperar build limpia en Netlify
- Confirmar que funciones serverless se publiquen sin error

## Smoke test minimo en produccion

### CRM email

- Abrir Admin > CRM unificado
- Confirmar que el remitente visible sea `Geobooker Ads <hola@geobooker.com.mx>`
- Preparar una cola corta de prueba
- Enviar prueba real
- Confirmar en Resend que aparezca el envio
- Confirmar que el correo recibido tenga footer, branding y CTA correctos

### WhatsApp local y global

- Abrir Admin > Scan & Invite
- Confirmar que el contador de enviados/restantes cargue
- Abrir Admin > Apify
- Confirmar que el contador global cargue
- Intentar generar un lote pequeno de prueba
- Confirmar que ya no aparezca falso bloqueo por limite agotado cuando el backend este sano

### B2B

- Abrir `Lanzar dentro de B2B`
- Usar `Enviar y pre-agendar proyecto`
- Confirmar que inserta lead sin error
- Revisar que el lead aparezca en base y en seguimiento comercial

## Riesgos aun abiertos

- Si el dominio verificado en Resend no coincide con `geobooker.com.mx`, el CRM podra mostrar un remitente correcto pero Resend no enviara como se espera.
- Si el SQL de produccion no se ejecuta, los contadores de WhatsApp y algunos flujos del CRM seguiran desalineados aunque el frontend ya este corregido.
- Si Netlify tiene variables antiguas, la rama puede compilar bien y aun asi fallar en produccion.
- Persisten advertencias de chunk size en build; no bloquean este release, pero conviene optimizarlas despues del lanzamiento estable.

## Criterio real de aprobacion

Geobooker puede considerarse "estable para produccion" cuando:

- el deploy este arriba,
- el SQL productivo este ejecutado,
- Resend muestre envios reales del CRM,
- los contadores de WhatsApp reflejen datos reales,
- y el flujo B2B capture leads sin error.
