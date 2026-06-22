# CRM -> N8N -> Email Exact Flow

## Cuando el admin usa `Enviar Secuencia N8N`

1. El CRM toma los contactos seleccionados en `UnifiedCRM`.
2. Exige que exista una plantilla activa seleccionada.
3. Exige que exista un remitente seleccionado.
4. Procesa variables como `{{contact_name}}`, `{{company_name}}` y `{{tier}}`.
5. Genera dos versiones del correo:
   - `html`: cuerpo procesado de la plantilla.
   - `rendered_html`: version final profesional con shell Geobooker + firma del remitente.
6. Hace un `POST` a `VITE_N8N_WEBHOOK_URL` o, si no existe, a:
   - `https://n8n.geobooker.com.mx/webhook/nuevo-lead-crm`

## Payload que ahora manda el CRM a n8n

```json
{
  "type": "crm_sequence",
  "table": "marketing_contacts",
  "schema": "public",
  "record": {
    "contact_id": "uuid",
    "tier": "AAA",
    "email": "contacto@empresa.com",
    "company_name": "Empresa",
    "contact_name": "Nombre",
    "city": "Ciudad",
    "state": "Estado",
    "industry": "Industria",
    "custom_message": "Texto opcional procesado"
  },
  "email_payload": {
    "template_id": "uuid",
    "template_name": "CRM Canonica - Invitacion Inicial",
    "template_type": "invitation",
    "subject": "Subject final procesado",
    "html": "HTML base procesado",
    "rendered_html": "HTML final profesional listo para enviar",
    "signature_html": "Firma del remitente",
    "from_name": "Juan",
    "from_email": "ventas@geobooker.com.mx",
    "company_name": "Empresa",
    "contact_name": "Nombre",
    "tier": "AAA"
  }
}
```

## Recomendacion para n8n

n8n ya no deberia usar HTML hardcodeado. Debe usar el payload del CRM y enviar `email_payload.rendered_html` como contenido final.

## Flujo recomendado en n8n

1. `Webhook CRM`
2. Validar que exista `body.record.email`
3. Validar que exista `body.email_payload.from_email`
4. Validar que exista `body.email_payload.rendered_html`
5. Enviar con Resend o llamar a `/.netlify/functions/send-notification-email`
6. Registrar resultado en logs o responder `200`

## Error de cola de 100 correos

El error `Could not find a relationship between email_queue and marketing_contacts in the schema cache` no era de contactos faltantes; era por depender de una relacion cacheada de Supabase. El CRM ya fue ajustado para:

1. Leer `email_queue` solo con sus columnas directas.
2. Consultar `marketing_contacts` en una segunda llamada.
3. Unir ambos resultados en JavaScript.

Con esto la generacion de cola deja de depender del cache de relaciones de Supabase.
