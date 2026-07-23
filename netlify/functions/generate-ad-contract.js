// netlify/functions/generate-ad-contract.js
/**
 * Generates a reviewable Enterprise Ads contract document from a real campaign.
 * The document is stored in the private `ad-contracts` bucket as printable HTML.
 * Admin can open it and use the browser print dialog to save/send as PDF.
 */
const { createClient } = require('@supabase/supabase-js');

const CONTRACT_BUCKET = 'ad-contracts';
const LEGAL_VERSION = 'ads_terms_2026_v1';

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(amount = 0, currency = 'USD') {
  const numeric = Number(amount || 0);
  return `${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || 'USD'}`;
}

function listValue(value, fallback = 'No especificado') {
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value || fallback;
}

function detectLanguage(campaign, requestedLanguage) {
  if (requestedLanguage) return requestedLanguage;
  return String(campaign?.billing_country || '').toUpperCase() === 'MX' ? 'es' : 'en';
}

function buildTerms(language) {
  if (language === 'es') {
    return [
      'La compra programa una campana publicitaria dentro de Geobooker, pero la publicacion queda sujeta a revision editorial, territorial, fiscal y de inventario.',
      'Geobooker no garantiza ventas, reuniones, conversiones, trafico minimo ni resultados comerciales especificos. Los KPIs reportados son impresiones, clics, CTR, taps o interacciones disponibles segun el formato.',
      'El anunciante declara contar con derechos suficientes sobre marca, arte, imagenes, textos, URLs, promociones y materiales entregados.',
      'Geobooker puede rechazar, pausar o solicitar cambios si el arte, destino, industria, mensaje o territorio presenta riesgo legal, reputacional, fiscal, tecnico o de cumplimiento.',
      'La activacion estimada posterior al pago y materiales completos es de 12 a 72 horas, salvo revision adicional, fuerza mayor, falta de inventario o incumplimiento de politicas.',
      'Los importes, impuestos y tratamiento fiscal dependen del pais de facturacion, metodo de pago y documentacion proporcionada por el anunciante.',
      'La campana se mostrara conforme al territorio, fechas, espacios y segmentacion registrados en Geobooker, sujeto a disponibilidad tecnica y reglas de rotacion.',
      'Cualquier cancelacion, reprogramacion, makegood o ajuste operativo debe documentarse por escrito entre las partes.'
    ];
  }

  return [
    'The purchase schedules an advertising campaign inside Geobooker, but publication remains subject to editorial, territorial, fiscal and inventory review.',
    'Geobooker does not guarantee sales, meetings, conversions, minimum traffic or specific commercial outcomes. Reported KPIs may include impressions, clicks, CTR, taps or available interactions depending on placement format.',
    'The advertiser represents that it has sufficient rights over the brand, creative assets, images, copy, destination URLs, promotions and submitted materials.',
    'Geobooker may reject, pause or request changes if the creative, destination, industry, message or territory creates legal, reputational, fiscal, technical or compliance risk.',
    'Estimated activation after payment and complete materials is 12 to 72 hours, except when additional review, force majeure, inventory issues or policy concerns apply.',
    'Amounts, taxes and fiscal treatment depend on billing country, payment method and documentation provided by the advertiser.',
    'The campaign will be displayed according to the territory, dates, placements and targeting registered in Geobooker, subject to technical availability and rotation rules.',
    'Any cancellation, reschedule, makegood or operational adjustment must be documented in writing between the parties.'
  ];
}

function buildContractHtml({ campaign, contractNumber, language }) {
  const isSpanish = language === 'es';
  const currency = campaign.currency || 'USD';
  const subtotal = Number(campaign.total_budget || campaign.budget || 0);
  const iva = Number(campaign.iva_amount || 0);
  const total = Number(campaign.total_with_iva || subtotal + iva || subtotal);
  const terms = buildTerms(language);
  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(contractNumber)} - Geobooker Ads</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; background: #f8fafc; }
    .page { max-width: 920px; margin: 0 auto; padding: 40px 28px; background: white; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #f59e0b; padding-bottom: 22px; }
    .brand { font-size: 28px; font-weight: 800; letter-spacing: -0.04em; }
    .muted { color: #64748b; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    h1 { font-size: 25px; margin: 28px 0 8px; }
    h2 { font-size: 17px; margin: 28px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; vertical-align: top; }
    td:first-child { color: #64748b; width: 34%; }
    .terms li { margin: 9px 0; line-height: 1.45; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 44px; }
    .line { border-top: 1px solid #0f172a; padding-top: 10px; min-height: 70px; }
    .notice { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 14px 16px; color: #1e3a8a; }
    @media print { body { background: white; } .page { padding: 0; max-width: none; } .no-print { display: none; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div>
        <div class="brand">Geobooker Ads</div>
        <div class="muted">geobooker.com.mx · hola@geobooker.com.mx</div>
      </div>
      <div style="text-align:right">
        <div class="badge">${escapeHtml(contractNumber)}</div>
        <div class="muted" style="margin-top:8px;">${isSpanish ? 'Version legal' : 'Legal version'}: ${LEGAL_VERSION}</div>
        <div class="muted">${isSpanish ? 'Generado' : 'Generated'}: ${escapeHtml(generatedAt)}</div>
      </div>
    </section>

    <h1>${isSpanish ? 'Contrato de Pauta Publicitaria Enterprise' : 'Enterprise Advertising Campaign Agreement'}</h1>
    <p class="notice">${isSpanish
      ? 'Documento operativo revisable. La publicacion requiere aprobacion de creatividad, territorio, inventario y cumplimiento antes de activarse.'
      : 'Reviewable operational document. Publication requires creative, territory, inventory and compliance approval before activation.'}</p>

    <h2>${isSpanish ? '1. Partes' : '1. Parties'}</h2>
    <table>
      <tr><td>${isSpanish ? 'Proveedor' : 'Provider'}</td><td>Geobooker</td></tr>
      <tr><td>${isSpanish ? 'Anunciante' : 'Advertiser'}</td><td>${escapeHtml(campaign.advertiser_name || 'N/D')}</td></tr>
      <tr><td>Email</td><td>${escapeHtml(campaign.advertiser_email || 'N/D')}</td></tr>
      <tr><td>${isSpanish ? 'Pais de facturacion' : 'Billing country'}</td><td>${escapeHtml(campaign.billing_country || 'N/D')}</td></tr>
      <tr><td>${isSpanish ? 'Tratamiento fiscal' : 'Tax treatment'}</td><td>${escapeHtml(campaign.tax_status || 'N/D')}</td></tr>
    </table>

    <h2>${isSpanish ? '2. Alcance de campana' : '2. Campaign Scope'}</h2>
    <table>
      <tr><td>${isSpanish ? 'Campana' : 'Campaign'}</td><td>${escapeHtml(campaign.headline || campaign.advertiser_name || campaign.id)}</td></tr>
      <tr><td>${isSpanish ? 'Tipo / nivel' : 'Type / level'}</td><td>${escapeHtml(campaign.campaign_type || campaign.ad_level || 'enterprise_ads')}</td></tr>
      <tr><td>${isSpanish ? 'Paises objetivo' : 'Target countries'}</td><td>${escapeHtml(listValue(campaign.target_countries))}</td></tr>
      <tr><td>${isSpanish ? 'Ciudades objetivo' : 'Target cities'}</td><td>${escapeHtml(listValue(campaign.target_cities))}</td></tr>
      <tr><td>${isSpanish ? 'Inicio' : 'Start date'}</td><td>${escapeHtml(campaign.start_date || 'TBD')}</td></tr>
      <tr><td>${isSpanish ? 'Fin' : 'End date'}</td><td>${escapeHtml(campaign.end_date || 'TBD')}</td></tr>
      <tr><td>${isSpanish ? 'URL destino' : 'Destination URL'}</td><td>${escapeHtml(campaign.cta_url || 'TBD')}</td></tr>
    </table>

    <h2>${isSpanish ? '3. Inversion y fiscalidad' : '3. Investment and Tax'}</h2>
    <table>
      <tr><td>${isSpanish ? 'Subtotal' : 'Subtotal'}</td><td>${formatMoney(subtotal, currency)}</td></tr>
      <tr><td>IVA / VAT</td><td>${formatMoney(iva, currency)}</td></tr>
      <tr><td>${isSpanish ? 'Total registrado' : 'Registered total'}</td><td><strong>${formatMoney(total, currency)}</strong></td></tr>
      <tr><td>${isSpanish ? 'Estado de pago' : 'Payment status'}</td><td>${escapeHtml(campaign.payment_status || 'pending')}</td></tr>
    </table>

    <h2>${isSpanish ? '4. Terminos operativos clave' : '4. Key Operating Terms'}</h2>
    <ol class="terms">${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join('')}</ol>

    <h2>${isSpanish ? '5. Revision y firma' : '5. Review and Signature'}</h2>
    <p>${isSpanish
      ? 'Este contrato debe ser revisado por el anunciante y Geobooker. La firma puede realizarse por escrito, por aceptacion digital documentada o mediante proveedor de firma electronica autorizado por las partes.'
      : 'This agreement must be reviewed by the advertiser and Geobooker. Signature may be completed in writing, by documented digital acceptance, or through an e-signature provider authorized by both parties.'}</p>

    <div class="signatures">
      <div class="line"><strong>${escapeHtml(campaign.advertiser_name || 'Advertiser')}</strong><br/><span class="muted">${isSpanish ? 'Firma del anunciante' : 'Advertiser signature'}</span></div>
      <div class="line"><strong>Geobooker</strong><br/><span class="muted">${isSpanish ? 'Firma autorizada' : 'Authorized signature'}</span></div>
    </div>

    <p class="muted" style="margin-top:36px;font-size:12px;">${isSpanish
      ? 'Informativo: este documento es una plantilla operativa y debe ser validado por asesoria legal antes de adoptarse como contrato definitivo para jurisdicciones especificas.'
      : 'Informational: this document is an operational template and should be reviewed by legal counsel before being adopted as a final contract for specific jurisdictions.'}</p>
  </main>
</body>
</html>`;
}

async function ensureContractBucket(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((bucket) => bucket.id === CONTRACT_BUCKET || bucket.name === CONTRACT_BUCKET);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(CONTRACT_BUCKET, { public: false });
  if (error && !/already exists/i.test(error.message || '')) {
    throw error;
  }
}

async function requireAdmin(serviceClient, authHeader = '') {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, statusCode: 401, error: 'Missing authorization token' };

  const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return { ok: false, statusCode: 401, error: 'Invalid authorization token' };

  const { data: admin, error: adminError } = await serviceClient
    .from('admin_users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (adminError || !admin) return { ok: false, statusCode: 403, error: 'Admin access required' };
  return { ok: true, user, admin };
}

exports.handler = async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing Supabase service configuration' }) };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const adminCheck = await requireAdmin(supabase, event.headers.authorization || event.headers.Authorization || '');
    if (!adminCheck.ok) {
      return { statusCode: adminCheck.statusCode, headers, body: JSON.stringify({ error: adminCheck.error }) };
    }

    const { campaignId, language: requestedLanguage } = JSON.parse(event.body || '{}');
    if (!campaignId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'campaignId is required' }) };

    const { data: campaign, error: campaignError } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Campaign not found' }) };
    }

    await ensureContractBucket(supabase);

    const language = detectLanguage(campaign, requestedLanguage);
    const contractNumber = campaign.contract_number || `GBK-ADS-${new Date().getFullYear()}-${String(campaign.id).slice(0, 8).toUpperCase()}`;
    const contractHtml = buildContractHtml({ campaign, contractNumber, language });
    const storagePath = `${campaign.id}/${language}/${contractNumber}.html`;

    const { error: uploadError } = await supabase.storage
      .from(CONTRACT_BUCKET)
      .upload(storagePath, Buffer.from(contractHtml, 'utf8'), {
        contentType: 'text/html; charset=utf-8',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: signedData, error: signedError } = await supabase.storage
      .from(CONTRACT_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    if (signedError) throw signedError;

    const scope = {
      campaign_id: campaign.id,
      contract_number: contractNumber,
      ad_level: campaign.ad_level || null,
      campaign_type: campaign.campaign_type || null,
      target_countries: campaign.target_countries || [],
      target_cities: campaign.target_cities || [],
      start_date: campaign.start_date || null,
      end_date: campaign.end_date || null,
      cta_url: campaign.cta_url || null
    };

    const fiscal = {
      billing_country: campaign.billing_country || null,
      tax_status: campaign.tax_status || null,
      currency: campaign.currency || 'USD',
      subtotal: campaign.total_budget || campaign.budget || 0,
      iva_amount: campaign.iva_amount || 0,
      total_with_iva: campaign.total_with_iva || campaign.total_budget || campaign.budget || 0,
      invoice_required: campaign.invoice_required || false,
      invoice_status: campaign.invoice_status || null
    };

    const { data: contract, error: contractError } = await supabase
      .from('ad_campaign_contracts')
      .upsert({
        campaign_id: campaign.id,
        contract_type: 'enterprise_ads',
        language,
        legal_version: LEGAL_VERSION,
        status: 'generated',
        advertiser_name: campaign.advertiser_name || null,
        advertiser_email: campaign.advertiser_email || null,
        billing_country: campaign.billing_country || null,
        campaign_scope: scope,
        fiscal_snapshot: fiscal,
        terms_snapshot: {
          review_sla: '12-72h',
          requires_bilateral_review: true,
          publication_requires_approval: true,
          no_guaranteed_sales: true,
          signature_provider: 'pending'
        },
        contract_html: contractHtml,
        pdf_url: signedData.signedUrl,
        storage_path: storagePath,
        generated_at: new Date().toISOString()
      }, { onConflict: 'campaign_id,contract_type,language,legal_version' })
      .select()
      .single();

    if (contractError) throw contractError;

    await supabase
      .from('ad_campaigns')
      .update({
        contract_number: contractNumber,
        contract_status: 'generated',
        contract_language: language,
        contract_pdf_url: signedData.signedUrl,
        contract_generated_at: new Date().toISOString()
      })
      .eq('id', campaign.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        contractId: contract.id,
        contractNumber,
        language,
        storagePath,
        signedUrl: signedData.signedUrl,
        expiresInDays: 7
      })
    };
  } catch (error) {
    console.error('[generate-ad-contract] Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
