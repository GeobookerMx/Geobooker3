# WhatsApp template strategy

## Canonical P0 set — 2026-09-14

The current release gate is the 12-template set documented in
`WHATSAPP_TEMPLATE_SUBMISSION_PACK_P0_2026-09-14.md`: six `es_MX` templates and
their six `en_US` equivalents. Any smaller or differently named set later in
this historical strategy is superseded for P0 readiness.

## Initial languages

Start with:

- `es_MX`
- `en_US`

Prepare later:

- `en_GB`
- `es_ES`
- `de`
- `fr`
- `it`
- `nl`
- `pt_BR`
- `ar`

## Initial templates

Utility:

- `gb_requested_info`
- `gb_appointment_confirmation`
- `gb_appointment_reminder`

Marketing:

- `gb_business_followup`
- `gb_business_registration`
- `gb_app_download`

## Recommended first production template set

Create these manually in WhatsApp Manager first, wait for Meta approval, then
run `Sync from Meta` inside `/admin/whatsapp`.

| Template | Language | Category | CRM stage | Suggested body | Safe use | Do not use for |
| --- | --- | --- | --- | --- | --- | --- |
| `gb_optin_confirm_es_mx` | `es_MX` | `UTILITY` | consent | `Hola {{1}}, confirmamos que deseas recibir informacion de Geobooker para {{2}} por WhatsApp. Puedes responder ALTO si no deseas continuar.` | After a form, QR, landing page or explicit request. | Unknown consent, CSV-only prospects, scraped phones. |
| `gb_meeting_confirm_es_mx` | `es_MX` | `UTILITY` | meeting | `Hola {{1}}, confirmamos tu reunion con Geobooker para el {{2}} a las {{3}}. Si necesitas cambiarla, responde a este mensaje.` | Confirming a meeting the person requested or accepted. | First commercial contact. |
| `gb_proposal_followup_es_mx` | `es_MX` | `UTILITY` | proposal | `Hola {{1}}, te compartimos seguimiento de la propuesta {{2}} de Geobooker. Puedes revisarla aqui: {{3}}. Si tienes dudas, con gusto te apoyamos.` | Following up on a requested/sent proposal. | Promising guaranteed sales or meetings. |
| `gb_business_ads_intro_es_mx` | `es_MX` | `MARKETING` | nurture | `Hola {{1}}, en Geobooker podemos ayudarte a impulsar visibilidad y oportunidades para negocios de {{3}} en {{2}}. Si te interesa, podemos compartirte opciones.` | Only with evidenced marketing opt-in. | Cold outreach, purchased lists, public directory phones. |
| `gb_optin_confirm_en_us` | `en_US` | `UTILITY` | consent | `Hi {{1}}, this confirms you asked to receive Geobooker updates for {{2}} via WhatsApp. Reply STOP if you do not want to continue.` | After an explicit English-language request. | Unknown consent. |
| `gb_global_ads_intro_en_us` | `en_US` | `MARKETING` | nurture | `Hi {{1}}, Geobooker can help businesses in {{2}} improve visibility through {{3}} campaigns. If useful, we can share a short overview.` | Only with evidenced marketing opt-in and approved market policy. | Cold global blasting. |

Suggested variable discipline:

- keep variables short and factual;
- avoid sensitive personal data in template variables;
- never include access tokens, internal IDs or private CRM notes;
- store final Meta-approved components in `crm.whatsapp_templates` through sync;
- only approved templates can pass the campaign gates.

## Approval rules

The CRM must not allow outbound template messages unless:

- template exists in `crm.whatsapp_templates`;
- `approval_status = approved`;
- provider status is not rejected, paused, deleted or disabled;
- language matches the campaign localization;
- consent purpose matches the template category;
- suppression checks pass.

## Builder requirements

Admin should be able to inspect:

- template name
- language
- category
- status
- quality
- header
- body
- footer
- buttons
- variables
- preview
- last synced time

## Current WhatsApp Center support

The `/admin/whatsapp` templates tab supports:

- Sync from Meta through the protected `whatsapp-admin` function.
- Total, approved, pending and inactive counts.
- Base language readiness for `es_MX` and `en_US`.
- Filters by provider status, language and category.
- Component and variable inspection.

It does not create templates inside Meta yet. Template creation and approval
remain a manual Meta Manager step until a dedicated builder is implemented.
