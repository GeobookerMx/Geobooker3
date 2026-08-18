const DEFAULT_BASE_URL = 'https://geobooker.com.mx';

function buildFooter({ companyName = 'tu empresa', unsubscribeUrl } = {}) {
    const preferenceNotice = unsubscribeUrl
        ? `
                <p>
                    Si no deseas recibir más comunicaciones comerciales,
                    <a href="${unsubscribeUrl}">date de baja con un clic</a>.
                </p>`
        : `
                <p>
                    Este mensaje corresponde a una notificación solicitada o relacionada con tu cuenta u operación.
                </p>`;

    return `
        <div class="gb-footer">
            <div class="gb-footer-brand">
                <img
                    src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png"
                    alt="Geobooker"
                    class="gb-footer-logo"
                />
                <p class="gb-footer-text">
                    Geobooker ayuda a las personas a descubrir negocios, servicios y lugares relevantes.
                </p>
            </div>
            <div class="gb-footer-meta">
                <p><strong>Web:</strong> <a href="${DEFAULT_BASE_URL}">${DEFAULT_BASE_URL}</a></p>
                <p><strong>Email comercial:</strong> <a href="mailto:hola@geobooker.com.mx">hola@geobooker.com.mx</a></p>
                <p>
                    Esta comunicación comercial fue revisada para <strong>${companyName}</strong>.
                    Geobooker no solicita contraseñas, pagos ni información confidencial por correo.
                </p>
                ${preferenceNotice}
            </div>
        </div>
    `;
}

function wrapEmailLayout({
    contentHtml,
    preheader = 'Geobooker',
    title = 'Geobooker',
    companyName = 'tu empresa',
    unsubscribeUrl
}) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; background: #eef2ff; font-family: Arial, Helvetica, sans-serif; color: #1f2937; }
        .gb-preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; }
        .gb-shell { padding: 28px 12px; background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%); }
        .gb-card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.10); }
        .gb-header { padding: 30px 28px 24px; background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 60%, #2563eb 100%); color: white; text-align: center; }
        .gb-header img { width: 210px; max-width: 100%; height: auto; display: block; margin: 0 auto 14px; }
        .gb-header p { margin: 0; font-size: 13px; opacity: 0.92; letter-spacing: 0.4px; }
        .gb-content { padding: 34px 28px 22px; font-size: 16px; line-height: 1.65; color: #1f2937; }
        .gb-content a { color: #2563eb; }
        .gb-footer { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 28px; }
        .gb-footer-brand { text-align: center; margin-bottom: 18px; }
        .gb-footer-logo { width: 145px; max-width: 100%; height: auto; opacity: 0.92; }
        .gb-footer-text { margin: 12px 0 0; color: #475569; font-size: 13px; line-height: 1.6; }
        .gb-footer-meta { color: #64748b; font-size: 12px; line-height: 1.7; text-align: center; }
        .gb-footer-meta p { margin: 7px 0; }
        .gb-footer-meta a { color: #2563eb; text-decoration: none; }
        @media (max-width: 640px) {
            .gb-shell { padding: 12px 0; }
            .gb-content, .gb-footer, .gb-header { padding-left: 18px; padding-right: 18px; }
        }
    </style>
</head>
<body>
    <div class="gb-preheader">${preheader}</div>
    <div class="gb-shell">
        <div class="gb-card">
            <div class="gb-header">
                <img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" />
                <p>Descubrimiento local y presencia comercial responsable</p>
            </div>
            <div class="gb-content">
                ${contentHtml}
            </div>
            ${buildFooter({ companyName, unsubscribeUrl })}
        </div>
    </div>
</body>
</html>`;
}

module.exports = { wrapEmailLayout };
