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

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function buildCampaignEmail({
    html,
    subject,
    companyName,
    contactName,
    tier,
    signatureHtml,
    preheader,
    unsubscribeUrl
}) {
    const htmlVariables = {
        companyName: escapeHtml(companyName),
        contactName: escapeHtml(contactName),
        tier: escapeHtml(tier)
    };
    const renderedHtml = renderCampaignCopy(html, htmlVariables);
    const renderedSignature = renderCampaignCopy(signatureHtml, htmlVariables);
    const contentHtml = `${extractBodyContent(renderedHtml)}${renderedSignature ? `\n${extractBodyContent(renderedSignature)}` : ''}`;

    return wrapEmailLayout({
        contentHtml: contentHtml || '<p>Mensaje sin contenido</p>',
        preheader: escapeHtml(preheader || `Información de Geobooker para ${companyName || 'tu empresa'}`),
        title: escapeHtml(renderCampaignCopy(subject || 'Mensaje de Geobooker', { companyName, contactName, tier })),
        companyName: escapeHtml(companyName || 'tu empresa'),
        unsubscribeUrl
    });
}

module.exports = {
    extractBodyContent,
    escapeHtml,
    renderCampaignCopy,
    buildCampaignEmail
};
