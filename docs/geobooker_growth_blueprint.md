# Geobooker Growth Blueprint

## 1. App stability before store release

- Michelin and Green Star rendering is now protected against stale viewport responses.
- Award filters now fall back safely to seed data when the viewport has no Supabase matches.
- Tracking remains consent-aware for web and ATT-aware for iOS native.

## 2. Top negocios

### Product goal

Create a Geobooker-native ranking layer that answers:

- Top 5 barberias en CDMX
- Top 5 taquerias en Tijuana
- Top 5 mecanicos en Monterrey
- Top 5 panaderias en Madrid
- Top 5 restaurantes mexicanos en Los Angeles

### Ranking principles

- Separate organic ranking from sponsored inventory.
- Separate Geobooker score from external awards.
- Make the score explainable, versioned, and recalculable.

### Geobooker Quality Score v1

Recommended weighted inputs:

- `rating promedio`: 22%
- `numero de resenas`: 12%
- `resenas recientes`: 10%
- `perfil completo`: 8%
- `negocio verificado`: 10%
- `fotos reales`: 6%
- `horarios actualizados`: 5%
- `clics/favoritos/contactos/reservas`: 15%
- `reportes negativos`: -12%
- `senales externas permitidas`: 4%
- `premios oficiales`: 20%

### Badges to render

- `Top 5 en tu ciudad`
- `Top 10 en tu ciudad`
- `Mejor calificado`
- `Negocio verificado`
- `Recomendado por Geobooker`
- `Favorito local`
- `Premio externo/oficial`
- `Patrocinado`

### Delivery phases

Phase 1:

- Persist score snapshots in `business_quality_scores`
- Show Top 5 modules by city/category
- Render explanation badges in cards and map sheets

Phase 2:

- Add ranking pages by city + category
- Add language and country variants
- Add business-facing score explanations in dashboard

Phase 3:

- Add near-me radius ranking
- Add time-window ranking trends
- Add advertiser-safe sponsored placements clearly labeled

## 3. GA4 + UTM + attribution

### Target state

Every public link should carry a stable campaign structure:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- optional context: `country`, `city`, `lang`, `category`, `subcategory`, `placement`

### Naming standard

- `geobooker_launch_mx`
- `geobooker_business_free_listing`
- `geobooker_tiktok_english_leads`
- `geobooker_michelin_map`
- `geobooker_top5_city`
- `geobooker_qr_restaurants`

### Channel standard

- `organic_social`
- `paid_social`
- `seo`
- `referral`
- `email`
- `qr`
- `direct`

### Events that must exist

- `search`
- `view_business`
- `view_business_profile`
- `tap_whatsapp`
- `tap_call`
- `open_directions`
- `sign_up`
- `login`
- `business_created`
- `claim_business_start`
- `claim_business_complete`
- `top_businesses_click`
- `michelin_campaign_click`
- `qr_attribution_captured`

### Reporting outcomes

- Which campaign drives registrations
- Which channel drives business creation
- Which city and country are growing
- Which language converts better
- Which content theme performs best
- Which QR or creator produced the visit

## 4. What was implemented in code now

- Central attribution capture service with first-touch and last-touch persistence
- GA4 events enriched with UTM and channel metadata
- Supabase event payloads enriched with attribution where flexible metadata already exists
- Business creation tracking linked to attribution
- Optional SQL migration to harden analytics tables and add Top negocios score infrastructure
