# WhatsApp production readiness - 2026-09-09

## Current position

Geobooker has a production WhatsApp Cloud API phone configured for CRM use, but
commercial sending must remain disabled until the production gates below are
closed.

## Production identity

| Item | Value | Status |
| --- | --- | --- |
| WABA | `4731600213830930` | Configured |
| Phone Number ID | `1358408147344707` | Configured |
| Visible number | `+52 55 7405 7295` | Cloud API / CRM |
| Public human WhatsApp | `+52 55 2670 2368` | Sales, support, billing and escalation |
| Graph API version | `v26.0` | Configured |
| Send switch | `WHATSAPP_SEND_ENABLED=false` | Must remain disabled |
| Business verification | Meta Business verified | Confirmed manually 2026-09-09 |
| WABA account review | Approved | Confirmed manually 2026-09-09 |
| Payment method | Configured in Meta, MXN | Confirmed manually 2026-09-09 |

## Routing rule

Use `+52 55 2670 2368` as the public human contact number across public
profiles, support and sales surfaces.

Use `+52 55 7405 7295` as the CRM Cloud API number for consented notifications,
approved templates, campaign attribution and automated status tracking. Do not
publish it as the general WhatsApp contact until the production checklist is
complete.

## Production gates before enabling send

| Gate | Required result |
| --- | --- |
| WABA subscription | App Geobooker is returned by `/{WABA_ID}/subscribed_apps` |
| Webhook field | `messages` is subscribed and callback URL matches Supabase Edge Function |
| Webhook inbound | Real inbound message creates/associates contact, contact point, conversation, message, activity and webhook event |
| HMAC | `x-hub-signature-256` is required and verified for POST |
| Status webhooks | `sent`, `delivered`, `read` and `failed` are persisted idempotently |
| Templates | Real Meta templates synced and approved before use |
| Consent | WhatsApp consent is stored by channel and purpose |
| Suppression | Opt-out/do-not-contact blocks all affected campaigns and replies |
| Worker | `whatsapp-worker` deployed and observable, with retry and dead letter handling |
| Budget | Active budget policy exists before queueing campaign sends |
| Billing | Payment method and cost model are confirmed |
| Secrets | Access token, app secret, verify token and PIN remain server-side only |
| App secret | Rotate before commercial production if it was used during setup/testing |

## Next implementation block

1. Run a server-side health check from `/admin/whatsapp`.
2. Confirm WABA subscription and `messages` field using Meta Graph API.
3. Sync templates from Meta.
4. Certify one real inbound production message without enabling outbound sends.
5. Certify status webhooks.
6. Deploy `whatsapp-worker` with `WHATSAPP_SEND_ENABLED=false`.
7. Add/verify consent, suppression, budget and rate card gates.

## Do not do yet

- Do not enable `WHATSAPP_SEND_ENABLED`.
- Do not use scraped or purchased phone numbers for WhatsApp marketing.
- Do not publish the Cloud API number as the general support line yet.
- Do not mix sample Meta payloads into production KPIs.
- Do not use the Geobooker WABA as a general WABA for third-party clients.
