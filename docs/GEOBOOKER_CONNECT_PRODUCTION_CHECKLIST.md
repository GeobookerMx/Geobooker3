# Geobooker Connect - Checklist de Produccion

## 1. SQL

Ejecutar en este orden:

1. `supabase/geobooker_connect_launch.sql`
2. Si no esta vigente aun, el hotfix CRM/WhatsApp/email que ya usan:
   - `supabase/fix_crm_whatsapp_email_hotfix.sql`
3. Recargar schema:
   - `NOTIFY pgrst, 'reload schema';`

## 2. Variables de entorno

Netlify / produccion:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLIC_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` o `VITE_SUPABASE_URL`
- `RESEND_API_KEY`
- `CRM_DEFAULT_FROM_ADDRESS`
- `CRM_DEFAULT_FROM_NAME`
- `CRM_REPLY_TO_EMAIL`
- `RESEND_VERIFIED_DOMAIN`
- `ADMIN_EMAIL`
- `URL`

## 3. Dominio / remitentes recomendados

No usar el mismo remitente reputacional para todo.

Recomendado:

- producto: `hola@geobooker.com.mx`
- ads / CRM principal: `crm@geobooker.com.mx`
- connect: `hola@geobooker.com.mx`

Ideal despues:

- subdominio dedicado tipo `connect.geobooker.com.mx`

## 4. Stripe

### Producto operativo

Crear un producto simple de reserva Connect o usar amount dinamico como ya hace el checkout.

### Webhook

Confirmar que Stripe apunte a:

- `/.netlify/functions/stripe-webhook`

Eventos minimos:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`

## 5. QA funcional

1. Entrar a `/b2b-connect`
2. Verificar texto comercial y CTA de reserva
3. Entrar a `/b2b-connect/checkout?package=connect_launch_1000`
4. Generar una reserva con datos de prueba
5. Confirmar que:
   - inserte en `enterprise_leads`
   - inserte en `connect_campaigns`
6. Completar checkout Stripe
7. Confirmar que el webhook:
   - actualice `connect_campaigns.payment_status = paid`
   - deje `fulfillment_status = brief_review`
8. Verificar pantalla `/b2b-connect/success`
9. Verificar email de confirmacion al cliente
10. Verificar notificacion interna / trazabilidad operativa

## 6. Politica operativa

Antes de ejecutar campañas reales:

- validar fuente y finalidad
- revisar copy
- revisar opt-out / suppression
- no usar WhatsApp API sin opt-in valido
- no prometer entregabilidad o CTR garantizados

## 7. Decision comercial recomendada

Mantener el precio de `$500 MXN` solo como:

- reserva
- anticipo
- fee de activacion de lanzamiento

No usarlo como precio definitivo universal del servicio completo.
