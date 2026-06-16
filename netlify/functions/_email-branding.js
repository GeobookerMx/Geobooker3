const DEFAULT_BASE_URL = 'https://geobooker.com.mx';
const DEFAULT_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.geobooker.app&hl=es_MX';
const DEFAULT_IOS_URL = 'https://apps.apple.com/mx/app/geobooker-cerca-de-ti/id6758590506';

function buildTrackedUrl(target) {
    const base = target === 'android_store' ? DEFAULT_ANDROID_URL
        : target === 'ios_store' ? DEFAULT_IOS_URL
            : `${DEFAULT_BASE_URL}/download`;

    const url = new URL(base);
    url.searchParams.set('utm_source', 'crm_email');
    url.searchParams.set('utm_medium', 'email');
    url.searchParams.set('utm_campaign', 'geobooker_ads');
    url.searchParams.set('qr_target', target);
    return url.toString();
}

function buildQrImageUrl(target) {
    return `https://quickchart.io/qr?size=170&text=${encodeURIComponent(buildTrackedUrl(target))}`;
}

function buildFooter({ companyName = 'tu empresa' } = {}) {
    const androidUrl = buildTrackedUrl('android_store');
    const iosUrl = buildTrackedUrl('ios_store');

    return `
        <div class="gb-footer">
            <div class="gb-footer-brand">
                <img
                    src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png"
                    alt="Geobooker"
                    class="gb-footer-logo"
                />
                <p class="gb-footer-text">
                    Geobooker Ads ayuda a negocios locales a ganar visibilidad con espacios patrocinados,
                    métricas reales y presencia en búsqueda, mapa y páginas de ciudad.
                </p>
            </div>

            <div class="gb-cta-card">
                <h3>Descarga Geobooker y conoce nuestros espacios publicitarios</h3>
                <p>
                    Tus clientes pueden encontrarte en web, Android e iPhone.
                    También puedes usar estos accesos para presentar Geobooker con más profesionalismo.
                </p>
                <div class="gb-store-buttons">
                    <a href="${androidUrl}" target="_blank" rel="noopener noreferrer">Google Play</a>
                    <a href="${iosUrl}" target="_blank" rel="noopener noreferrer">App Store</a>
                </div>
            </div>

            <div class="gb-qr-grid">
                <div class="gb-qr-card">
                    <img src="${buildQrImageUrl('android_store')}" alt="QR Google Play" />
                    <strong>QR Android</strong>
                    <span>Escanea para abrir Google Play</span>
                </div>
                <div class="gb-qr-card">
                    <img src="${buildQrImageUrl('ios_store')}" alt="QR App Store" />
                    <strong>QR iPhone</strong>
                    <span>Escanea para abrir App Store</span>
                </div>
            </div>

            <div class="gb-footer-meta">
                <p><strong>Web:</strong> <a href="${DEFAULT_BASE_URL}">${DEFAULT_BASE_URL}</a></p>
                <p><strong>Email comercial:</strong> <a href="mailto:hola@geobooker.com.mx">hola@geobooker.com.mx</a></p>
                <p>
                    Este mensaje comercial se envía porque <strong>${companyName}</strong> aparece como negocio público
                    o contacto comercial relacionado con presencia local.
                </p>
                <p>Si no deseas más mensajes corporativos, responde este correo con la palabra <strong>BAJA</strong>.</p>
            </div>
        </div>
    `;
}

function wrapEmailLayout({ contentHtml, preheader = 'Geobooker Ads', title = 'Geobooker Ads', companyName = 'tu empresa' }) {
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
        .gb-cta-card { background: linear-gradient(135deg, #dbeafe 0%, #eef2ff 100%); border: 1px solid #bfdbfe; border-radius: 16px; padding: 18px; text-align: center; margin-bottom: 18px; }
        .gb-cta-card h3 { margin: 0 0 8px; color: #0f172a; font-size: 18px; }
        .gb-cta-card p { margin: 0; color: #475569; font-size: 13px; line-height: 1.6; }
        .gb-store-buttons { margin-top: 14px; }
        .gb-store-buttons a { display: inline-block; margin: 6px; padding: 10px 16px; border-radius: 999px; background: #0f172a; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 700; }
        .gb-qr-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
        .gb-qr-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; text-align: center; }
        .gb-qr-card img { width: 120px; height: 120px; display: block; margin: 0 auto 10px; }
        .gb-qr-card strong { display: block; color: #0f172a; font-size: 14px; margin-bottom: 4px; }
        .gb-qr-card span { color: #64748b; font-size: 12px; }
        .gb-footer-meta { color: #64748b; font-size: 12px; line-height: 1.7; text-align: center; }
        .gb-footer-meta p { margin: 7px 0; }
        .gb-footer-meta a { color: #2563eb; text-decoration: none; }
        @media (max-width: 640px) {
            .gb-shell { padding: 12px 0; }
            .gb-content, .gb-footer, .gb-header { padding-left: 18px; padding-right: 18px; }
            .gb-qr-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="gb-preheader">${preheader}</div>
    <div class="gb-shell">
        <div class="gb-card">
            <div class="gb-header">
                <img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" />
                <p>Publicidad local, premium y enterprise para hacer crecer tu negocio</p>
            </div>
            <div class="gb-content">
                ${contentHtml}
            </div>
            ${buildFooter({ companyName })}
        </div>
    </div>
</body>
</html>`;
}

module.exports = {
    buildTrackedUrl,
    buildQrImageUrl,
    wrapEmailLayout,
};
