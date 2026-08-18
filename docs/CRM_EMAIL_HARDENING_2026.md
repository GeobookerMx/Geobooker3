# Geobooker CRM Email Hardening 2026

Status: implemented in an isolated branch, disabled by default, not deployed.

The Resend account/profile login is not a sending identity. The production
sender for this integration is `Geobooker <notificaciones@geobooker.com>`
because `geobooker.com` is the verified sending domain. Replies go to the
monitored official mailbox configured in `CRM_REPLY_TO_EMAIL`.

## Safety state

- Resend API keys must remain absent while the CRM audit is open.
- Existing contacts and queue rows are preserved.
- Queue generation and email sending require independent server and client flags.
- WhatsApp, n8n and CRM imports are outside this activation.

## Required server configuration before any future activation

```text
RESEND_VERIFIED_DOMAIN=geobooker.com
CRM_DEFAULT_FROM_ADDRESS=notificaciones@geobooker.com
CRM_REPLY_TO_EMAIL=<a real monitored mailbox>
CRM_ALLOWED_REPLY_TO_DOMAINS=geobooker.com,geobooker.com.mx
CRM_UNSUBSCRIBE_SECRET=<dedicated random secret of at least 32 characters>
CRM_EMAIL_MAX_DAILY=25
CRM_EMAIL_MAX_BATCH=10
CRM_EMAIL_QUEUE_ENABLED=false
CRM_EMAIL_SEND_ENABLED=false
```

`RESEND_API_KEY` must not be restored until the domain, templates, contacts and deployment are approved.

The public UI remains closed unless these build-time flags are also explicitly enabled:

```text
VITE_CRM_EMAIL_QUEUE_ENABLED=false
VITE_CRM_EMAIL_SEND_ENABLED=false
```

## Contact eligibility gate

A contact is sendable only when all conditions are true:

- valid email format;
- active CRM contact;
- not unsubscribed, bounced, complained or suppressed;
- `email_marketing_allowed = true`;
- documented `email_contact_basis` and verification timestamp;
- `compliance_risk = low`;
- `crm_readiness_score >= 70`;
- company and contact names are present.

Existing and newly imported contacts default to not allowed. Public availability of an address is not sufficient authorization.

## Activation order

1. Apply the additive database migration.
2. Review and approve contacts individually or through an audited controlled batch.
3. Confirm the professional templates and one-click unsubscribe flow.
4. Verify the dedicated sending domain or subdomain in Resend.
5. Create a domain-scoped `Sending access` API key.
6. Configure the server variables while both enable flags remain false.
7. Enable queue preparation only.
8. Review the resulting queue.
9. Enable sending only after a separate production authorization.

No step in this document authorizes importing contacts, activating WhatsApp, enabling n8n or sending a campaign.
