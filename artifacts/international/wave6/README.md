# Geobooker international expansion — Wave 6

Status: generated locally; not uploaded; not public.

Source: Overture Maps Places `2026-08-19.0`.

Markets:

- Singapore: 1,000 private records
- Seoul: 1,000 private records
- Dubai: 1,000 private records
- Stockholm: 1,000 private records
- Vienna: 1,000 private records
- Brussels: 1,000 private records

Automated checks passed for every batch:

- duplicate records: 0%
- invalid coordinates: 0%
- coordinates outside the approved bounding box: 0%
- no batch changes the public RLS policy
- every imported row starts with `is_visible = FALSE`
- every record has a usable address
- websites and phone numbers pass format validation
- website-or-phone availability ranges from 93.4% to 99.8% by market

The deterministic content audit also produced a 100-record CSV sample for each city. These samples are intended for the final human location and business-existence review.

Manual review is still required. Do not apply or activate a market until a sample of at least 100 records has been reviewed for business name, city, address, category, and map position.

Safe release order:

1. Apply `20260824010000_gate_international_visibility_by_market.sql`.
2. Apply `20260824011000_prepare_high_value_wave6.sql`.
3. Apply one city seed only; it remains private.
4. Run `wave6-quality-review.sql` and manually inspect at least 100 records.
5. Record the QA metrics in `international_markets`.
6. With final admin approval, call `approve_international_market_release(market_id)`.
7. Add the same active market and verified record count to `src/config/publicGlobalMarkets.json` and deploy.

The SQL files and their SHA-256 checksums are paired with the corresponding `.report.json` files.
