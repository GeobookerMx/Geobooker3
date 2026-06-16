# Operacion CRM Geobooker Ads

Fecha: 2026-06-15

## 1. Que hace cada boton

### Preparar Cola Real
- Inserta contactos reales en `email_queue`.
- No envia correos.
- Solo prepara pendientes para envio posterior.

### Enviar X emails
- Toma la cola visible del CRM.
- Usa `send-notification-email` con Resend.
- Registra `message_id` y escribe historial en `campaign_history` y `crm_email_logs`.

### Vista previa
- Muestra el contenido del correo con branding, footer y QR.
- No envia correos.

### Enviar a N8N
- Solo manda un webhook con datos del contacto.
- No envia correos por si mismo a menos que el workflow de N8N tenga un paso final de envio.

## 2. Regla clave

Preparar cola != enviar.

Si alguien solo hizo clic en `Preparar Cola Real`, entonces:
- correos enviados por Resend: 0
- correos enviados por N8N: 0

## 3. Cuando si cuenta contra Resend

Cuenta contra Resend si:
- el CRM manda por `send-notification-email`, o
- N8N usa Resend con la misma cuenta/API key.

No cuenta contra Resend si:
- N8N usa otro proveedor SMTP/API distinto.

## 4. Flujo recomendado para Geobooker Ads

1. Seleccionar plantilla.
2. Seleccionar remitente.
3. Clic en `Preparar Cola Real`.
4. Revisar `Vista previa`.
5. Clic en `Enviar X emails`.
6. Verificar:
   - `campaign_history`
   - `crm_email_logs`
   - panel de Resend
   - webhook `resend-webhook`

## 5. Recomendacion para N8N

Si se quiere automatizar con N8N y mantener profesionalismo:
- N8N debe recibir `template_id`, `contact_id` y `sender`.
- N8N debe leer la plantilla desde Supabase.
- N8N debe reemplazar variables.
- N8N debe enviar por Resend si quieres trazabilidad centralizada.
- N8N debe registrar `message_id` en Supabase.

## 6. Estado actual

- El boton visible de envio ya existe en el panel `Lanzar`.
- El footer profesional con QR y branding ya se integra en correos `custom` y `crm_campaign`.
- La cola de email ahora corresponde a una cola real en base de datos.
