-- ==========================================
-- ACTUALIZACION DE REMITENTES CRM
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Eliminar remitentes antiguos o no verificados
DELETE FROM crm_email_senders
WHERE email NOT IN ('hola@geobooker.com.mx');

-- 2. Asegurar remitente operativo unico para Resend
INSERT INTO crm_email_senders (email, display_name, is_default, signature_html)
VALUES (
    'hola@geobooker.com.mx',
    'Geobooker Ads',
    TRUE,
    '<div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;">
        <p style="margin:0;font-weight:600;color:#1f2937;">Geobooker Ads</p>
        <p style="margin:2px 0;color:#6b7280;font-size:14px;">Publicidad local y enterprise</p>
        <p style="margin:12px 0 0 0;font-size:13px;color:#4b5563;">
            📧 hola@geobooker.com.mx<br>
            📞 +52 55 2670 2368<br>
            🌐 geobooker.com.mx
        </p>
    </div>'
)
ON CONFLICT (email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_default = EXCLUDED.is_default,
    signature_html = EXCLUDED.signature_html;
