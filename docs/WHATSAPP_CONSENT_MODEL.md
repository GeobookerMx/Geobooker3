# WhatsApp consent model

## Rule

Do not send WhatsApp marketing to scraped, purchased or merely public phone
numbers. WhatsApp marketing requires explicit opt-in evidence for the specific
channel and purpose.

## Purposes

Track consent separately for:

- service
- marketing
- authentication
- other valid purpose

Service consent or a customer-service conversation does not automatically allow
marketing campaigns.

## Required evidence

Store enough evidence to audit consent:

- contact
- tenant/workspace
- channel
- purpose
- consent source
- consent text/version
- consented_at
- campaign/form/landing source
- withdrawn_at when applicable

## Opt-out

Supported opt-out words should be configurable, including:

- STOP
- BAJA
- SALIR
- CANCELAR
- NO QUIERO
- UNSUBSCRIBE

An active opt-out, suppression, complaint, invalid number or do-not-contact
state must block future WhatsApp sends.

## Runtime enforcement

The production webhook recognizes exact, normalized opt-out commands. Defaults
are `STOP`, `BAJA`, `ALTO`, `SALIR`, `CANCELAR`, `PARAR`, `UNSUBSCRIBE`,
`NO QUIERO` and `NO DESEO`. Additional exact commands may be configured with
the server-side `WHATSAPP_OPT_OUT_KEYWORDS` comma-separated environment
variable. Substring matching is intentionally avoided to reduce false
positives.

For a real inbound opt-out the backend:

- records `opted_out` for WhatsApp service, transactional and marketing
  purposes;
- creates an active WhatsApp suppression linked to the contact point;
- records an auditable CRM activity without storing secrets;
- preserves idempotency when Meta retries the same provider message ID.

Meta sample/test payloads never alter real consent or suppression records.
Both the administrative queue endpoint and the delivery worker independently
re-check active suppressions and blocked WhatsApp permission states. Therefore
an opt-out received after queue creation still prevents provider delivery.

## Release evidence still required

Keep `WHATSAPP_SEND_ENABLED=false` until an allowlisted end-to-end test proves:

1. evidenced opt-in is eligible for the intended purpose;
2. one approved template can be queued and delivered;
3. a real inbound `BAJA` or `STOP` creates the permission and suppression rows;
4. a later outbound attempt is rejected as `recipient_suppressed`;
5. no duplicate message, suppression or activity is created on webhook retry.
