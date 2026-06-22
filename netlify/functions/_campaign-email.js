const { wrapEmailLayout } = require('./_email-branding');

function extractBodyContent(html = '') {
    const input = String(html || '').trim();
    if (!input) return '';

    const bodyMatch = input.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch?.[1]) {
        return bodyMatch[1].trim();
    }

    return input
        .replace(/<!doctype[^>]*>/gi, '')
        .replace(/<\/?(html|head|body)[^>]*>/gi, '')
        .trim();
}

function renderCampaignCopy(input = '', variables = {}) {
    let output = String(input || '');
    const replacements = [
        { tokens: ['{contact_name}', '{{contact_name}}', '{nombre}', '{{nombre}}'], value: variables.contactName },
        { tokens: ['{company_name}', '{{company_name}}', '{empresa}', '{{empresa}}'], value: variables.companyName },
        { tokens: ['{tier}', '{{tier}}'], value: variables.tier }
    ];

    replacements.forEach(({ tokens, value }) => {
        tokens.forEach((token) => {
            output = output.split(token).join(value || '');
        });
    });

    return output;
}

function buildCampaignEmail({
    html,
    subject,
    companyName,
    contactName,
    tier,
    signatureHtml,
    preheader
}) {
    const renderedHtml = renderCampaignCopy(html, { companyName, contactName, tier });
    const renderedSignature = renderCampaignCopy(signatureHtml, { companyName, contactName, tier });
    const contentHtml = `${extractBodyContent(renderedHtml)}${renderedSignature ? `\n${extractBodyContent(renderedSignature)}` : ''}`;

    return wrapEmailLayout({
        contentHtml: contentHtml || '<p>Mensaje sin contenido</p>',
        preheader: preheader || `${companyName || 'tu empresa'} puede anunciarse en Geobooker con espacios patrocinados`,
        title: renderCampaignCopy(subject || 'Mensaje de Geobooker', { companyName, contactName, tier }),
        companyName: companyName || 'tu empresa'
    });
}

module.exports = {
    extractBodyContent,
    renderCampaignCopy,
    buildCampaignEmail
};
