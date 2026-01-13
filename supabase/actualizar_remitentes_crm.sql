-- ==========================================
-- ACTUALIZACIÓN DE REMITENTES CRM
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Eliminar remitentes antiguos (limpieza)
DELETE FROM crm_email_senders 
WHERE email NOT IN ('juanpablopg@geobooker.com.mx', 'ventasgeobooker@gmail.com');

-- 2. Asegurar que Juan Pablo esté registrado y sea el default
INSERT INTO crm_email_senders (email, display_name, is_default, signature_html)
VALUES (
    'juanpablopg@geobooker.com.mx',
    'Juan Pablo Peña García',
    TRUE,
    '<div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;">
        <p style="margin:0;font-weight:600;color:#1f2937;">Juan Pablo Peña García</p>
        <p style="margin:2px 0;color:#6b7280;font-size:14px;">CEO & Fundador</p>
        <p style="margin:2px 0;font-weight:600;color:#3b82f6;">Geobooker</p>
        <p style="margin:12px 0 0 0;font-size:13px;color:#4b5563;">
            📞 +52 5513047404<br>
            🌐 geobooker.com.mx | geobooker.com<br>
            📍 México
        </p>
    </div>'
)
ON CONFLICT (email) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    is_default = EXCLUDED.is_default,
    signature_html = EXCLUDED.signature_html;

-- 3. Asegurar que Ventas esté registrado
INSERT INTO crm_email_senders (email, display_name, is_default, signature_html)
VALUES (
    'ventasgeobooker@gmail.com',
    'Ventas Geobooker',
    FALSE,
    '<div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;">
        <p style="margin:0;font-weight:600;color:#1f2937;">Equipo de Ventas</p>
        <p style="margin:2px 0;font-weight:600;color:#3b82f6;">Geobooker</p>
        <p style="margin:12px 0 0 0;font-size:13px;color:#4b5563;">
            📞 +52 5513047404<br>
            🌐 geobooker.com.mx | geobooker.com<br>
            📍 México
        </p>
    </div>'
)
ON CONFLICT (email) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    is_default = EXCLUDED.is_default,
    signature_html = EXCLUDED.signature_html;
