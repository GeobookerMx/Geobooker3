# CRM 360 dry-run adapters

## Purpose

`crm-reconcile-dry-run` inventories legacy CRM sources through the private,
idempotent ingestion ledger. It does not promote accounts or contacts, enqueue
email or WhatsApp messages, or call any external delivery provider.

Supported sources:

- `apify` -> `public.scraping_history`
- `scan_local` -> `public.scan_leads`
- `csv` -> CSV-origin rows in `public.marketing_contacts`
- `email_queue` -> `public.email_queue`
- `email_history` -> email rows in `public.campaign_history`

## Security gates

- Supabase gateway JWT verification is required.
- The function validates the bearer session again and requires an entry in
  `public.admin_users`.
- `CRM360_RECONCILIATION_ENABLED` must equal `true`; absent or false fails
  closed with HTTP 503.
- Requests are limited to 500 rows and the request body to 20 KB.
- Ledger tables remain inaccessible to `anon` and ordinary `authenticated`
  users. Writes use the server-side service role.
- Direct email addresses, phone numbers, notes and message bodies are never
  copied to `crm.source_events.normalized_payload` or returned to the client.
- `raw_payload` is always null.

## Idempotency

The idempotency key is a SHA-256 digest of source system, source record ID and
the normalized safe snapshot. Re-reading an unchanged row creates no duplicate
event. A materially changed safe snapshot produces a new review event and
retains its audit history.

## Activation order

1. Apply the CRM workspace and ingestion-ledger migrations.
2. Validate workspace isolation and zero unscoped rows.
3. Deploy `crm-reconcile-dry-run` with `verify_jwt=true`.
4. Keep `CRM360_RECONCILIATION_ENABLED=false` until an administrator schedules
   a bounded reconciliation window.
5. Enable only for the reconciliation window and start with `limit=25`.
6. Compare aggregate counts; do not promote entities until review rules pass.

Example administrative request body:

```json
{
  "source": "scan_local",
  "limit": 25,
  "offset": 0
}
```

The response contains aggregate counts and the next offset only. It does not
contain source records or personal data.

