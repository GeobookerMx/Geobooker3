# Approved international expansion commands

This command reference is the mandatory safety layer for the international expansion runbook. Do not call the legacy extraction or seed builders directly for new batches.

## Validate configuration

`python -B scripts/international/validate-expansion-config.py`

## Extract an approved market

`powershell -File scripts/international/extract-approved-overture-places.ps1 -Area us-los-angeles`

The wrapper blocks candidates, unknown markets, and markets without `extractionEnabled: true`.

## Prepare a traceable batch

`python -B scripts/international/prepare-market-batch.py --area us-los-angeles --limit 3000 --output .cache/international/us-los-angeles-3000.sql --report .cache/international/us-los-angeles-3000-report.json`

The wrapper enforces approved stage sizes, checks the city extraction geometry, rejects targets above the market limit, and writes a SHA-256 checksum. It generates files locally only and never applies SQL to Supabase.

## Apply policy

Generated SQL may be applied only to an isolated preview after the quality report, manual sample, RLS tests, quota threshold, and rollback identifier have been approved. Production application is a separate explicit operation.
