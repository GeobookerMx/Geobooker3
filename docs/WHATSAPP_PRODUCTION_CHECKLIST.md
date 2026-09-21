# WhatsApp production checklist

## Current rule

`WHATSAPP_SEND_ENABLED` must remain `false` until this checklist is complete.

## Required PASS items

| Item | Required before production send |
| --- | --- |
| Meta API | System User Token valid |
| Permissions | `business_management`, `whatsapp_business_messaging`, `whatsapp_business_management` |
| WABA | Production WABA accessible |
| Phone | Production phone registered in Cloud API |
| Subscription | App subscribed to WABA |
| Webhook field | `messages` subscribed |
| HMAC | Required and verified for POST |
| Inbound | Real inbound production message persisted |
| Statuses | `sent`, `delivered`, `read`, `failed` persisted idempotently |
| Templates | Approved templates synced |
| Consent | Purpose-specific WhatsApp consent enforced |
| Suppression | Opt-out/do-not-contact blocks sends |
| Worker | Deployed, observable and kill-switch aware |
| Retry | Retries only temporary failures |
| Dead letter | Non-retryable failures isolated |
| Billing | Payment method and cost source confirmed |
| Rate cards | Country/category rates stored with effective dates |
| Audit | Sensitive admin actions logged without secrets |
| Secrets | No frontend/mobile/repo exposure |

## Manual actions

- Approve templates in Meta.
- Business verification: confirmed approved in Meta on 2026-09-09.
- Billing/payment method: confirmed configured in Meta on 2026-09-09.
- Confirm messaging capacity before the first commercial campaign.
- Decide when to rotate the app secret before commercial launch.
