# WhatsApp architecture

## Purpose

WhatsApp in Geobooker is a measured CRM channel, not a standalone chat screen.
It must connect campaign, lead, consent, conversation, message, status,
opportunity, revenue and attribution without exposing Meta credentials.

## Runtime flow

1. Admin CRM calls `whatsapp-admin` with a valid Supabase user session.
2. `whatsapp-admin` reads server-side secrets and operational CRM records.
3. Public Meta webhook calls `whatsapp-webhook` without Supabase JWT.
4. `whatsapp-webhook` verifies `hub.challenge` for GET and HMAC for POST.
5. Incoming messages and statuses are persisted idempotently in `crm`.
6. Outbound requests are queued before provider delivery.
7. `whatsapp-worker` is the only delivery path to Meta once sending is enabled.

## Environment split

| Environment | Usage |
| --- | --- |
| Test | Meta sample payloads and authorized sandbox checks only |
| Production configured | Real WABA/phone registered, sends disabled |
| Production active | Only after templates, consent, suppression, billing, worker and status webhooks pass |

## Server-side only

Never expose these to frontend, mobile apps, repositories or logs:

- `WHATSAPP_ACCESS_TOKEN`
- `META_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_TWO_STEP_PIN`
- `SUPABASE_SERVICE_ROLE_KEY`

## CRM tables

Core WhatsApp state uses:

- `crm.whatsapp_business_accounts`
- `crm.whatsapp_phone_numbers`
- `crm.whatsapp_templates`
- `crm.webhook_events`
- `crm.conversations`
- `crm.messages`
- `crm.message_status_events`
- `crm.outbound_jobs`
- `crm.channel_permissions`
- `crm.suppressions`
- `crm.activities`
- `crm.usage_ledger`

