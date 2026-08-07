# International market expansion runbook

## Purpose

Expand Geobooker city by city without bulk-publishing a country, exposing private data, or allowing a data import to saturate the map or the database.

The source of truth for rollout decisions is `scripts/international/expansion-markets.json`. Extraction geometry remains isolated in `scripts/international/pilot-areas.json`. A candidate market cannot be extracted until it has an approved bounding box and `extractionEnabled` is set to `true` after review.

## Market lifecycle

1. `candidate`: demand is being measured; extraction is blocked.
2. `planned`: city, source, license, bounding box, target, and owner are approved.
3. `extracting`: a local Overture extract is being generated. Nothing is uploaded.
4. `qa`: deduplication and the 100-record manual sample are in progress.
5. `preview`: data is available only in an isolated deploy preview.
6. `active`: the public application may search the market on demand.
7. `paused`: public discovery is disabled while records remain available for investigation.
8. `retired`: the market is no longer part of the rollout.

## Batch stages

Markets grow through deterministic stages of 1,000, 3,000, 5,000, and at most 10,000 records. Moving to the next stage requires evidence from searches, zero-result searches, result clicks, route actions, claims, and data quality. Premium or recommended status never bypasses query relevance.

Only 20 relevant results may be returned to a user search. The full market catalog must never be loaded into the browser or rendered as default map markers.

## Approval gates

A batch may reach preview only when all of the following are true:

- Source release and attribution are recorded.
- The generated SQL and quality report have a checksum.
- At least 100 records were reviewed manually.
- At least 95 percent of sampled names and locations are correct.
- Visible duplicates are below 5 percent.
- Invalid coordinates are below 1 percent.
- RLS tests pass for anonymous, authenticated, owner, and administrator roles.
- Database usage is below the 70 percent pause threshold.
- A rollback migration or batch identifier is recorded.

Production activation requires a second person or explicit owner approval after preview verification. Import generation and production application must remain separate operations.

## Secure operating procedure

1. Validate the market manifest locally:

   `python scripts/international/validate-expansion-config.py`

2. Approve extraction in the manifest and add a reviewed bounding box to `pilot-areas.json`.
3. Extract only the approved city with `extract-overture-places.ps1`.
4. Generate deterministic SQL and a JSON quality report with `build-overture-seed.py`.
5. Review duplicates, attribution, public business contact fields, and the 100-record sample.
6. Create an `international_import_batches` entry in preview and attach the report/checksum.
7. Apply the generated migration to preview only.
8. Test search, map icons, profiles, claims, RLS, and takedown behavior.
9. Activate the market only after all gates pass.

## Security boundaries

- Never expose a Supabase service-role key in browser code.
- Imported records remain unverified until claimed and reviewed.
- Evidence submitted for claims is not part of the public business profile.
- Candidate and preview market metadata is administrator-only.
- Public users can read only markets with `status = 'active'`.
- No import job may directly change an active market without a traceable batch.
- Store source URLs instead of copying remote images into Supabase Storage.
- Analytics should retain city-level demand, not unnecessary precise user coordinates.

## Current rollout

Los Angeles, Toronto, and Madrid each have a 1,000-record preview seed. Their next allowed target is 3,000, but no expansion batch is approved merely by this document. Miami, Houston, Vancouver, Barcelona, London, Bogota, Buenos Aires, Santiago, and Lima are candidates only; extraction remains disabled until demand and geometry are reviewed.
