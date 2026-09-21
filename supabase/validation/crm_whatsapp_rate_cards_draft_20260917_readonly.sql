-- Read-only validation for the reviewed draft rate-card import.

SELECT
  rate_card_version,
  status,
  currency,
  count(*) AS total_rows
FROM crm.whatsapp_rate_cards
WHERE rate_card_version = 'meta-list-mxn-observed-2026-09-17-v1'
GROUP BY rate_card_version, status, currency
ORDER BY status, currency;

SELECT
  country_code,
  category,
  currency,
  unit_cost,
  status,
  source_checked_at
FROM crm.whatsapp_rate_cards
WHERE rate_card_version = 'meta-list-mxn-observed-2026-09-17-v1'
ORDER BY country_code, category;

SELECT count(*) AS active_rows_for_this_version
FROM crm.whatsapp_rate_cards
WHERE rate_card_version = 'meta-list-mxn-observed-2026-09-17-v1'
  AND status = 'active';

