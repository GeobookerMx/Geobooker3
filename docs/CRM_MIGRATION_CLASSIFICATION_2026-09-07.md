# CRM/WhatsApp migration classification - 2026-09-07

This file classifies the local Supabase migrations before any production push.
Do not run `supabase db push` blindly: the repo contains large seed files,
market expansion migrations, CRM foundation migrations, and security hotfixes
that have different blast radiuses.

## Current local gate

- `supabase/config.toml` exposes `public`, `graphql_public`, and `crm`.
- `whatsapp-webhook` is configured with `verify_jwt = false`.
- `whatsapp-admin`, `whatsapp-send`, and `crm-import-dry-run` are configured
  with `verify_jwt = true`.
- The Supabase CLI is not available in this Windows session, so remote migration
  history still needs to be reconciled from a machine/session with the CLI or
  from the Dashboard SQL editor.

## Apply first - security and platform gates

These are small, mostly additive/restrictive, and belong before enabling CRM
feature flags or mobile builds.

- `20260809010000_security_rate_limiting.sql`
- `20260809070000_fix_security_definer_views.sql`
- `20260813010000_security_audit_snapshot.sql`
- `20260813020000_protect_premium_entitlements.sql`
- `20260813030000_connect_server_only_inserts.sql`
- `20260818020000_app_runtime_events.sql`
- `20260907010000_restore_premium_rate_limit.sql`

## Apply for CRM/WhatsApp foundation

Apply in this order only. The later permission hardening intentionally closes
direct browser access that earlier foundation migrations temporarily grant for
admin read policies.

- `20260813040000_crm_whatsapp_foundation.sql`
- `20260813041000_crm_import_staging.sql`
- `20260813042000_crm_sales_operations.sql`
- `20260813043000_crm_admin_directory.sql`
- `20260830220000_whatsapp_webhook_audit_fields.sql`
- `20260830230000_crm_postgrest_service_role_only.sql`
- `20260830231000_whatsapp_meta_sample_isolation.sql`
- `20260902090000_whatsapp_template_sync_metadata.sql`
- `20260907020000_harden_crm_service_role_permissions.sql`
- `20260907021000_whatsapp_outbound_job_claiming.sql`
- `20260907022000_crm_campaign_readiness.sql`
- `20260907023000_crm_whatsapp_campaign_preview.sql`

Expected final state:

- `anon` has no direct `crm` schema or table privileges.
- `authenticated` has no direct `crm` schema or table privileges.
- `service_role` has `USAGE` on `crm`.
- `service_role` has `SELECT`, `INSERT`, and `UPDATE` on CRM tables.
- `service_role` does not have `DELETE` on CRM tables.
- Admin UX reads CRM through protected RPCs or `whatsapp-admin`, not direct
  client-side `.schema('crm')` calls.
- Campaign readiness is aggregate/admin-only and does not send messages.
- WhatsApp campaign preview is bounded, admin-only, read-only and does not
  enqueue jobs.

## Apply only after CRM foundation is confirmed

These depend on CRM/email/ad objects and should be applied after verifying the
base schema exists in production.

- `20260813044000_resend_webhook_idempotency.sql`
- `20260819013000_align_crm_sender_to_hola_geobooker_mx.sql`
- `20260819133000_ad_campaign_post_sale_email_tracking.sql`
- `20260819134000_resend_webhook_event_types.sql`
- `20260819135000_ads_global_targeting_hardening.sql`
- `20260820103000_crm_email_resend_governance.sql`
- `20260820113000_crm_email_queue_eligibility_diagnostics.sql`
- `20260820143000_upgrade_crm_email_templates_launch_urgency.sql`
- `20260824160000_advertiser_kpi_security_and_reports.sql`
- `20260824193000_admin_analytics_observed_v1.sql`

## Hold - large seeds and international market data

These files create or insert large international directory data. They are useful
for expansion, but should not be bundled into the CRM/WhatsApp stabilization
push unless the release explicitly includes international directory rollout.

- `20260807023100_international_overture_pilot_seed.sql`
- `20260807050000_seed_miami_overture_pilot.sql`
- `20260807051000_seed_houston_overture_pilot.sql`
- `20260807052000_seed_vancouver_overture_pilot.sql`
- `20260807053000_seed_barcelona_overture_pilot.sql`
- `20260807054000_seed_london_overture_pilot.sql`
- `20260807055000_seed_bogota_overture_pilot.sql`
- `20260807060000_seed_amsterdam_overture_pilot.sql`
- `20260807061000_seed_rome_overture_pilot.sql`
- `20260807062000_seed_milan_overture_pilot.sql`
- `20260807063000_seed_paris_overture_pilot.sql`
- `20260807064000_seed_berlin_overture_pilot.sql`
- `20260807065000_seed_lisbon_overture_pilot.sql`
- `20260809030000_seed_sao_paulo_overture_pilot.sql`
- `20260809031000_seed_new_york_overture_pilot.sql`
- `20260809032000_seed_mexico_city_overture_pilot.sql`
- `20260809050000_seed_tokyo_overture_pilot.sql`
- `20260809051000_seed_sydney_overture_pilot.sql`
- `20260809052000_seed_dublin_overture_pilot.sql`
- `20260809053000_seed_zurich_overture_pilot.sql`
- `20260809054000_seed_medellin_overture_pilot.sql`

## Hold - market rollout operations

These change market visibility/approval state. Keep them separate from CRM
stabilization so a data-release decision does not get mixed with WhatsApp.

- `20260807030000_verify_international_overture_pilot.sql`
- `20260807033000_international_business_claims.sql`
- `20260807040000_international_market_rollouts.sql`
- `20260807040100_harden_international_market_visibility.sql`
- `20260807041000_search_international_businesses_on_demand.sql`
- `20260807070000_register_european_expansion_markets.sql`
- `20260809025000_international_businesses_wave4_compat.sql`
- `20260809040000_register_wave4_expansion_markets.sql`
- `20260809060000_register_wave5_expansion_markets.sql`
- `20260815010000_register_wave6_expansion_markets.sql`
- `20260824010000_gate_international_visibility_by_market.sql`
- `20260824011000_prepare_high_value_wave6.sql`
- `20260824012000_approve_international_market_release.sql`
- `20260824013000_mark_wave6_qa_pending_manual.sql`

## Hold - non-CRM product surface

These can be valuable, but they should be reviewed against the current product
release because they touch directory/search/storage rather than the CRM core.

- `20260807023000_consumption_auth_funnel_views.sql`
- `20260818010000_directory_search_space_listings.sql`
- `20260819004500_ensure_rental_space_columns.sql`
- `20260819005000_ensure_space_listing_images_bucket.sql`

## Manual reconciliation marker

- `20260814010000_remote_manual_changes.sql`

This should be treated as a migration-history marker, not as a feature. Confirm
whether the manual remote change is still present before marking it applied.

## Production apply checklist

1. Back up the database or capture a restore point.
2. Confirm remote migration history before applying anything.
3. Apply only the selected block, in timestamp order.
4. Run privilege checks for `crm` after the CRM block.
5. Confirm `WHATSAPP_SEND_ENABLED=false`.
6. Run `whatsapp-admin` health with a real admin session.
7. Do not enable CRM2 feature flags until health, import dry run, inbox, and
   permissions are all PASS.
