# Auditoria Ads / Pagos / Buckets - 2026-10-02

## Estado actual

GeoScore ya funciona como entrada comercial. El flujo de Ads tiene una base operativa real:

- Wizard de campana local con creativo, segmentacion, fechas, IVA y pago.
- Checkout de Stripe con autoridad de precio del lado servidor.
- OXXO disponible solo para MX cuando el producto lo permite.
- Webhook firmado de Stripe para activar campanas pagadas.
- Bucket publico `ad-creatives` para piezas de anuncios.
- Bucket privado `ad-contracts` para contratos.
- Reportes y KPIs por campana con lectura restringida.
- Eventos comerciales puenteados a `crm_commercial_events` cuando la tabla existe.

## Mejora aplicada

Se agrego auditoria/idempotencia de webhooks de Stripe:

- Nueva tabla `public.stripe_webhook_events`.
- `stripe_event_id` unico para evitar doble procesamiento.
- Estado `processing`, `processed` o `failed`.
- Payload del evento guardado con acceso solo `service_role`.
- El webhook ignora duplicados ya procesados.
- El webhook marca eventos fallidos para permitir diagnostico.
- Se agrego manejo de `payment_intent.canceled` para pagos cancelados o expirados.

Archivos:

- `supabase/migrations/20261002113000_ads_stripe_webhook_audit_idempotency.sql`
- `netlify/functions/stripe-webhook.js`
- `scripts/tests/ads-commercial-flow-security.test.mjs`

## Riesgos pendientes

- Aplicar la migracion nueva en Supabase antes de esperar auditoria completa de Stripe.
- Confirmar que el webhook de Stripe en Dashboard envie al menos:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `invoice.payment_succeeded`
  - `customer.subscription.deleted`
- Confirmar variables Netlify:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PAYMENT_STATUS_TOKEN_SECRET`
  - `INTERNAL_FUNCTION_SECRET`
- Revisar si `crm_commercial_events`, `ad_campaign_contracts`, `ad-creatives` y `ad-contracts` ya existen en produccion.
- Crear una vista admin simple para listar pagos pendientes, OXXO pendientes, webhooks fallidos y campanas `pending_review`.

## Comando de verificacion local

```bash
node scripts/tests/ads-commercial-flow-security.test.mjs
node --check netlify/functions/stripe-webhook.js
npx eslint netlify/functions/stripe-webhook.js --max-warnings 0
```

