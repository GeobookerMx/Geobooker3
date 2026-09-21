-- GEOBOOKER — Verificación de migraciones pendientes en producción
-- Ejecutar como READ-ONLY en Supabase SQL Editor de PRODUCCIÓN
-- No modifica nada. Solo compara lo que ya se aplicó.
--
-- Instrucciones:
-- 1. Abre Supabase Dashboard → SQL Editor en el proyecto de producción
-- 2. Pega y ejecuta este script
-- 3. Cualquier migración con status = 'PENDIENTE' debe aplicarse en orden

SELECT
  expected.name AS migration_file,
  CASE
    WHEN applied.name IS NOT NULL THEN '✅ APLICADA'
    ELSE '🔴 PENDIENTE'
  END AS status,
  applied.executed_at
FROM (
  VALUES
    ('20260807023000_consumption_auth_funnel_views'),
    ('20260807033000_international_business_claims'),
    ('20260807040000_international_market_rollouts'),
    ('20260807040100_harden_international_market_visibility'),
    ('20260807041000_search_international_businesses_on_demand'),
    ('20260809010000_security_rate_limiting'),
    ('20260809025000_international_businesses_wave4_compat'),
    ('20260809070000_fix_security_definer_views'),
    ('20260813010000_security_audit_snapshot'),
    ('20260813020000_protect_premium_entitlements'),
    ('20260813030000_connect_server_only_inserts'),
    ('20260813040000_crm_whatsapp_foundation'),
    ('20260813041000_crm_import_staging'),
    ('20260813042000_crm_sales_operations'),
    ('20260813043000_crm_admin_directory'),
    ('20260813044000_resend_webhook_idempotency'),
    ('20260814010000_remote_manual_changes'),
    ('20260815010000_register_wave6_expansion_markets'),
    ('20260818010000_directory_search_space_listings'),
    ('20260818020000_app_runtime_events'),
    ('20260819004500_ensure_rental_space_columns'),
    ('20260819005000_ensure_space_listing_images_bucket'),
    ('20260819013000_align_crm_sender_to_hola_geobooker_mx'),
    ('20260819133000_ad_campaign_post_sale_email_tracking'),
    ('20260819134000_resend_webhook_event_types'),
    ('20260819135000_ads_global_targeting_hardening'),
    ('20260820103000_crm_email_resend_governance'),
    ('20260820113000_crm_email_queue_eligibility_diagnostics'),
    ('20260820143000_upgrade_crm_email_templates_launch_urgency'),
    ('20260824010000_gate_international_visibility_by_market'),
    ('20260824011000_prepare_high_value_wave6'),
    ('20260824012000_approve_international_market_release'),
    ('20260824013000_mark_wave6_qa_pending_manual'),
    ('20260824160000_advertiser_kpi_security_and_reports'),
    ('20260824193000_admin_analytics_observed_v1'),
    ('20260830220000_whatsapp_webhook_audit_fields'),
    ('20260830230000_crm_postgrest_service_role_only'),
    ('20260830231000_whatsapp_meta_sample_isolation'),
    ('20260902090000_whatsapp_template_sync_metadata'),
    ('20260907010000_restore_premium_rate_limit'),
    ('20260907020000_harden_crm_service_role_permissions'),
    ('20260907021000_whatsapp_outbound_job_claiming'),
    ('20260907022000_crm_campaign_readiness'),
    ('20260907023000_crm_whatsapp_campaign_preview'),
    ('20260907024000_crm_whatsapp_campaign_drafts'),
    ('20260907025000_crm_whatsapp_campaign_approval_gate'),
    ('20260908010000_crm_whatsapp_campaign_dispatch_preflight'),
    ('20260908011000_crm_whatsapp_international_consent_gate'),
    ('20260908012000_crm_workspace_foundation'),
    ('20260908013000_crm_ingestion_360_foundation'),
    ('20260908014000_crm_sql_editor_reconciliation_access'),
    ('20260908015000_crm_global_campaign_planning'),
    ('20260910200357_crm_agent_knowledge_files'),
    ('20260910204000_crm_agent_connector_requests'),
    -- SEPTIEMBRE 17-21: estas son las más importantes a verificar
    ('20260917010000_crm_whatsapp_commercial_safety_gates'),
    ('20260917020000_crm_whatsapp_rate_cards_draft_20260917'),
    ('20260917021000_crm_whatsapp_template_reconciliation'),
    ('20260917022000_crm_whatsapp_pilot_budget_gate'),
    ('20260917023000_crm_whatsapp_inbound_service_pilot'),
    ('20260918161000_crm_whatsapp_activity_metrics'),
    ('20260918213000_crm_whatsapp_consent_acquisition'),
    ('20260920130000_crm_whatsapp_campaign_wizard_v2'),
    ('20260920140000_crm_enable_ads_followup_es_mx_pilot_template'),
    ('20260920141000_crm_enable_mx_marketing_pilot_gates'),
    ('20260921010000_GEOSCORE_PHASE2_foundation_v1'),
    ('20260921090000_search_discovery_catalog_v2'),
    ('20260921100000_crm_whatsapp_atomic_campaign_dispatch')
) AS expected(name)
LEFT JOIN supabase_migrations.schema_migrations AS applied
  ON applied.name = expected.name
ORDER BY expected.name;
