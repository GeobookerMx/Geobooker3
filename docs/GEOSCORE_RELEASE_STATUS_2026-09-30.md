# GeoScore release status - 2026-09-30

## Current state

| Phase | State | Release meaning |
|---|---|---|
| 1. Architecture and model contract | Complete | Product boundaries, provenance and explainability are defined. |
| 2. Schema, RLS and fail-closed flags | Complete | Browser writes are blocked; backend owns calculations and persistence. |
| 3. Internal metrics and source coverage | Complete foundation | Geobooker directory coverage can be measured. DENUE, INEGI and Overture adapters still require ingestion QA. |
| 4. Multi-pillar engine | Safe preview deployed | Mexico-only, read-only preview. No score is emitted with fewer than five located businesses in the radius. |
| 5. Admin and public UI | Implemented locally | Displays real backend errors and insufficient coverage without inventing a score. Web deployment is still required. |
| 6. Calibration and production activation | Pending | Requires representative city/category samples, benchmark outcomes, regression tests and explicit feature-flag activation. |
| 7. Mobile release QA | Pending | Validate Maps restrictions, GPS, GeoScore response, PWA prompt exclusion and TestFlight smoke tests. |

## Production rule

GeoScore is an exploratory location indicator. It must not promise sales, traffic or profitability. A score is available only for Mexico and only when the selected radius has at least five geolocated businesses in the current approved dataset.

## Next data milestone

Ingest one controlled city/category pilot with provenance, license, freshness and category mapping. Calibrate thresholds only after comparing GeoScore factors with observed business outcomes. Do not activate global scoring by reusing Mexico thresholds.

## Mobile Maps requirement

The app renders Maps JavaScript inside the Capacitor WebView. The build must inject `VITE_GOOGLE_MAPS_API_KEY`. Its Google Cloud browser restrictions must allow the production domains and `https://localhost/*`, which is the configured Android/iOS WebView origin. The native Android Maps SDK key is not used by this implementation.
