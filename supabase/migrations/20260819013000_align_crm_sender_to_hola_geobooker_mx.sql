-- Align CRM senders with the verified Resend domain geobooker.com.mx.
-- Authorized operational change: use hola@geobooker.com.mx as the canonical
-- sending and reply identity for CRM/marketing outreach.

INSERT INTO public.crm_settings (setting_key, setting_value, description)
VALUES (
  'email_senders',
  jsonb_build_array(
    jsonb_build_object(
      'name', 'Geobooker Ads',
      'email', 'hola@geobooker.com.mx',
      'signature', '<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;"><p><strong>Geobooker Ads</strong><br>Publicidad local y enterprise<br>📧 hola@geobooker.com.mx<br>🌐 <a href="https://geobooker.com.mx">geobooker.com.mx</a></p></div>',
      'use_for', jsonb_build_array('default', 'crm')
    )
  ),
  'Remitentes verificados para campañas CRM'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

UPDATE public.crm_email_senders
SET is_default = FALSE
WHERE email <> 'hola@geobooker.com.mx';

INSERT INTO public.crm_email_senders (email, display_name, is_default, signature_html)
VALUES (
  'hola@geobooker.com.mx',
  'Geobooker Ads',
  TRUE,
  '<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;"><p><strong>Geobooker Ads</strong><br>Publicidad local y enterprise<br>📧 hola@geobooker.com.mx<br>🌐 <a href="https://geobooker.com.mx">geobooker.com.mx</a></p></div>'
)
ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_default = TRUE,
  signature_html = EXCLUDED.signature_html;
