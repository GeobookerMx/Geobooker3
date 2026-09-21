-- Official WhatsApp Business Platform list rates transcribed from Meta's
-- pricing surface on 2026-09-17. Values are stored as DRAFT only.
--
-- This migration never activates a rate, enables a frequency policy, creates
-- an outbound job, or changes WHATSAPP_SEND_ENABLED.
--
-- Source: https://whatsappbusiness.com/es-la/products/platform-pricing/
-- Currency selected in the official UI: MXN.
-- "North America" was supplied for the initial US market and is represented
-- by country_code US. Add CA as a separate reviewed row before targeting
-- Canada, even if Meta currently displays the same regional list rate.

INSERT INTO crm.whatsapp_rate_cards (
  provider,
  rate_card_version,
  country_code,
  category,
  currency,
  unit_cost,
  effective_from,
  effective_to,
  source_url,
  source_checked_at,
  status
)
VALUES
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'MX', 'marketing', 'MXN', 0.561400, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'US', 'marketing', 'MXN', 0.460200, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'DE', 'marketing', 'MXN', 2.512400, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'GB', 'marketing', 'MXN', 1.168400, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'ES', 'marketing', 'MXN', 1.301800, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'CO', 'marketing', 'MXN', 0.230100, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'NL', 'marketing', 'MXN', 2.939400, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'FR', 'marketing', 'MXN', 1.581100, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'RU', 'marketing', 'MXN', 1.476200, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'MX', 'utility', 'MXN', 0.156500, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'US', 'utility', 'MXN', 0.062600, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'GB', 'utility', 'MXN', 0.404900, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'ES', 'utility', 'MXN', 0.368100, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'CO', 'utility', 'MXN', 0.014700, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft'),
  ('meta_cloud', 'meta-list-mxn-observed-2026-09-17-v1', 'NL', 'utility', 'MXN', 0.920300, '2026-09-17 00:00:00+00', NULL, 'https://whatsappbusiness.com/es-la/products/platform-pricing/', '2026-09-17 00:00:00+00', 'draft')
ON CONFLICT (provider, rate_card_version, country_code, category) DO NOTHING;

-- Expected after first application: 15 draft rows and zero active rows for
-- this version. Activation is a separate reviewed operation.

