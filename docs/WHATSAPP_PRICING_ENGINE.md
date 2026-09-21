# WhatsApp pricing engine

## Principle

Do not hardcode WhatsApp prices. Store rate cards by country, category,
currency, effective period and provider source.

Meta pricing changes over time and varies by market. The official pricing
surface is:

https://whatsappbusiness.com/products/platform-pricing/

## Implemented foundation (deployed, fail-closed)

Migration `20260917010000_crm_whatsapp_commercial_safety_gates.sql` adds:

- `crm.whatsapp_rate_cards`, versioned by country, category, currency and period;
- `crm.messaging_frequency_policies`, with 24-hour, 7-day and 30-day caps;
- `rate_card_id` attribution on `crm.usage_ledger`;
- `crm_whatsapp_outbound_guard(...)`, restricted to `service_role`;
- a second runtime check in the worker immediately before calling Meta.

The production SQL was applied and validated on 2026-09-17. The protected
`whatsapp-send` and `whatsapp-worker` runtimes enforce the guard before enqueue
and immediately before a provider call. The seed frequency policies are
intentionally `is_active=false` and `kill_switch=true`. No rate is seeded or
guessed. Therefore `total cards = 0` and `active rate cards = 0` is the expected,
safe state until an official Meta rate card is reviewed and imported.

Meta's official pricing page confirms that billing is per delivered message and
depends on recipient market and message category. Exact rates are dynamic and
must be taken from Meta's current rate-card surface or the business account's
official export; third-party price tables must not be used as production data.

Official source checked 2026-09-17:

https://whatsappbusiness.com/products/platform-pricing/

## Controlled rate-card onboarding

1. Export or download the current official rate card from Meta/WhatsApp Manager.
2. Verify currency, effective date, market, category and any volume tier.
3. Archive the source file/reference and review date without credentials.
4. Prepare an idempotent SQL import and validate it in a transaction.
5. Confirm that there is exactly one applicable active row per
   market/category/currency/tier/date combination.
6. Keep frequency policies inactive and kill-switched during validation.
7. Only after budget and policy approval, activate the required rows for an
   allowlisted pilot. `WHATSAPP_SEND_ENABLED` remains `false` until the complete
   pilot gate is approved separately.

The reviewed draft captured on 2026-09-17 is staged in
`20260917020000_crm_whatsapp_rate_cards_draft_20260917.sql`: 9 Marketing rows
and 6 Utility rows, all in MXN and all with `status='draft'`. The North America
rate is represented only as `US` for the initial United States scope; Canada
requires its own reviewed row before use. Authentication, Service and volume
tier data have not been supplied and are not inferred.

## Required model

Use `crm.usage_ledger` for message-level cost attribution and add/maintain a
rate-card table before commercial sending at scale.

Minimum rate-card fields:

- provider
- country_code
- market_name
- category
- currency
- rate
- effective_from
- effective_to
- volume_from
- volume_to
- source_url
- source_checked_at

## Message attribution

Each billable message should retain:

- provider_message_id
- campaign_id
- conversation_id
- contact_id
- recipient_country
- template_id
- language_code
- pricing_category
- billable
- estimated_cost
- currency
- rate_card_version
- delivered_at

## Forecasting

Before campaign launch, show:

- recipients by country
- template category
- estimated WhatsApp cost
- media spend
- Geobooker fee
- total client budget
- expected gross margin

## Fail-closed release gate

An outbound operation is rejected when any of the following is missing or
exceeded:

- recipient country;
- active rate card for country/category/effective period;
- rate-card currency matching the active budget policy;
- daily and monthly budget limits;
- active, reviewed frequency policy;
- minimum contact interval;
- 24-hour, 7-day or 30-day per-contact cap.

`WHATSAPP_SEND_ENABLED=false` remains the outer kill switch and is not modified
by rate cards or frequency policies.
