const fs = require('fs');
const path = require('path');
const { buildCampaignEmail } = require('../netlify/functions/_campaign-email');

const sampleBody = `
<p>Hola <strong>{contact_name}</strong>,</p>

<p>
    Te saludamos del equipo directivo de <strong>Geobooker</strong>. Hemos seleccionado a
    <strong>{company_name}</strong> dentro de nuestro programa de lanzamiento para negocios destacados,
    con el objetivo de brindarte mayor visibilidad frente a clientes que buscan activamente servicios y productos en tu zona.
</p>

<div style="margin:22px 0;padding:20px;border-radius:14px;background:#f0fdf4;border:1px solid #bbf7d0;">
    <p style="margin:0 0 8px;color:#166534;font-size:17px;font-weight:700;">
        ✨ Acceso Premium Sin Costo por Etapa de Lanzamiento
    </p>
    <p style="margin:0;color:#15803d;font-size:14px;line-height:1.6;">
        Queremos que <strong>{company_name}</strong> active su presencia preferente en nuestro mapa interactivo,
        verifique su ficha comercial y explore opciones de publicidad local y espacios patrocinados medibles.
    </p>
</div>

<p>
    Para validar la ficha de <strong>{company_name}</strong> y activar tu acceso premium de lanzamiento,
    simplemente responde a este correo con la palabra <strong>PREMIUM</strong> o contáctanos directamente.
</p>

<p style="color:#64748b;font-size:13.5px;margin-top:18px;">
    <em>Nota de lanzamiento: Los accesos preferenciales se liberan en cupos programados para garantizar la calidad del servicio.</em>
</p>

<p>Atentamente,<br><strong>Dirección Comercial Geobooker</strong></p>
`;

const html = buildCampaignEmail({
    html: sampleBody,
    subject: 'Invitación especial para impulsar {company_name} en Geobooker',
    companyName: 'Distribuidora Comercial México',
    contactName: 'Lic. Juan Pablo',
    tier: 'AAA',
    unsubscribeUrl: 'https://geobooker.com.mx/unsubscribe?email=contacto@ejemplo.com'
});

const outputPath = path.join(__dirname, '../reports/PREVIEW_NUEVO_CORREO_GEOBOOKER.html');
fs.writeFileSync(outputPath, html, 'utf8');
console.log('✅ Archivo de previsualización generado con éxito en:', outputPath);
