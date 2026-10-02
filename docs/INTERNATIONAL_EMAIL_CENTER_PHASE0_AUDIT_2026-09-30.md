# International Email Center: Phase 0 audit

Date: 2026-09-30

## Decision

Status: **NOT READY TO SEND COLD INTERNATIONAL EMAIL**.

Remote audit snapshot before deployment: email sending was enabled with a daily
limit of 100, 118 queue rows were pending, and 14,520 active contacts with email
matched the legacy eligibility shape. The audit did not find explicit evidence
fields in that legacy decision.

Deployment state: code and migration are locally verified. The production write
was not executed because pausing an active sender requires explicit operational
approval. No queue rows were modified by this audit.

The supplied master prompt is useful as a product brief, but it combines a safe
email pilot with a much larger provider, Ads, storage and reporting program. The
implementation should be phased. No mailbox connection, enrichment provider or
automatic international send has been enabled by this change.

DNS review on 2026-09-30 found Google and Zoho MX records at the same time,
DMARC with `p=none`, and no SPF result in the public TXT lookup. A DKIM selector
and the actual host of `juanpablopg@geobooker.com.mx` remain unconfirmed. Gmail
OAuth must not be implemented until mailbox ownership and routing are resolved.

Provider research also refined the free-tier assumptions:

- Hunter currently documents 50 credits per month and API access on Free.
- Apollo currently advertises 900 credits per seat/year, granted monthly. People
  Search costs zero credits but returns no email; enrichment costs credits.
- Snov currently offers 50 credits and 100 recipients on Trial, but API/webhook
  access is not normally included; Free users may request test API access.
- These quotas are not guaranteed lead counts and must be read from provider
  usage APIs or entered from the provider dashboard.

## What is safe now

- CSV, DENUE, INEGI, Overture, Apify and future sources may remain in CRM for
  research, account discovery and GeoScore.
- Those records are not automatically campaign recipients.
- The existing Resend marketing queue now requires `explicit_opt_in`, a consent
  timestamp and an auditable evidence reference.
- `crm.suppressions` remains the single suppression authority across channels.
- Unsubscribe, complaint, bounce and provider suppression events are propagated
  to the canonical email suppression list.
- The sender checks suppression both when loading a batch and immediately before
  the provider request. A suppression lookup failure stops processing.
- The database migration pauses the email sender but preserves existing pending
  queue rows for review; it does not delete or rewrite those rows.

## Why Resend is restricted

Resend's Acceptable Use Policy prohibits unsolicited messages, including cold
outreach and contact data obtained from purchased or scraped lists. Therefore
Resend is reserved for evidenced opt-in marketing in Geobooker:

- https://resend.com/legal/acceptable-use

The future cold-outreach pilot needs a separately approved mailbox transport and
jurisdiction review. The document's proposed Gmail MVP is technically possible
with `gmail.send`, while broader read/modify scopes add verification and security
assessment requirements:

- https://developers.google.com/workspace/gmail/api/guides/sending
- https://developers.google.com/workspace/gmail/api/auth/scopes

US commercial email requirements also apply to B2B messages and include truthful
headers/subjects, a postal address and a working opt-out honored promptly:

- https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business

This is a conservative software control, not legal advice. Each target country
still requires policy review before activation.

## Phase gates

### Phase 0 - completed in code

- Canonical global email suppression integration.
- Explicit opt-in gate for the existing Resend marketing queue.
- No raw recipient address in normal sender logs or API error summaries.
- Security regression tests.

### Phase 1 - readiness, no sending

- Confirm sending domain and mailbox provider.
- Confirm SPF, DKIM, DMARC and TLS.
- Provide valid postal address, privacy URL and unsubscribe URL.
- Approve claims, templates and country policy matrix.
- Store provider credentials only in server-side secrets.

### Phase 2 - reviewed pilot

- Add provider connectors for discovery/enrichment without automatic sending.
- Treat provider privacy/deletion signals as global suppression events.
- Require a human-reviewed brief and recipient list.
- Start with 10 reviewed contacts, maximum 5 new contacts per day.
- Permit at most one follow-up after the approved delay.

### Phase 3 - measurement and expansion

- Add replies only after the minimum Gmail read scope is approved.
- Measure sent, delivered, bounced, replied, opted out and estimated cost.
- Expand countries or volume only after deliverability and compliance review.

## Inputs still required

- Sending domain and mailbox choice.
- Legal business name and postal address for the footer.
- Approved privacy and international outreach policy.
- Initial country allow/review/block decisions.
- Approved offer, proof points and prohibited claims.
- Provider API credentials and budget limits.
- Resolution of mixed Google/Zoho MX routing and the intended mailbox host.
- SPF record and DKIM selector evidence.

## Implementation specification

The reviewed programmer specification is maintained at:

- `docs/PROMPT_MAESTRO_CRM_CORREO_INTERNACIONAL_2026-09-30.md`
