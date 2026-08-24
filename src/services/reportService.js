import { supabase } from '../lib/supabase';
import { getAuthenticatedJsonHeaders } from './authenticatedRequest';

/**
 * Service to handle User Generated Content (UGC) reporting
 * Complies with App Store requirements for content moderation
 */
export const reportService = {
    /**
     * Report a piece of content (review, comment, post, business)
     * @param {Object} reportData
     * @param {string} reportData.content_type - 'review', 'comment', 'post', 'business'
     * @param {string} reportData.content_id - ID of the content being reported
     * @param {string} reportData.reason - Short reason (e.g., 'spam', 'inappropriate')
     * @param {string} reportData.details - Detailed explanation
     * @returns {Promise<{success: boolean, error: any}>}
     */
    async reportContent({ content_type, content_id, reason, details }) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('content_reports')
                .insert({
                    reporter_id: user?.id || null,
                    content_type,
                    content_id,
                    reason,
                    details,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });

            if (error) {
                if (content_type === 'business' && error.code === '42P01') {
                    return this.reportBusinessLegacy({ content_id, reason, details });
                }
                throw error;
            }

            return { success: true };
        } catch (error) {
            console.error('Error reporting content:', error);
            return { success: false, error };
        }
    },

    /**
     * Legacy method for business reports
     */
    async reportBusinessLegacy({ content_id, reason, details }) {
        try {
            const { error } = await supabase
                .from('business_reports')
                .insert({
                    business_id: content_id,
                    reason,
                    details,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error reporting business (legacy):', error);
            return { success: false, error };
        }
    }
};

/**
 * Campaign Report Functions
 * Used by CampaignReportButton.jsx for ad campaign performance reports
 */

/**
 * Fetch campaign data + performance metrics from Supabase
 * @param {string} campaignId
 * @returns {Promise<Object>} Report data with campaign info and metrics
 */
export async function getCampaignReportData(campaignId) {
    const response = await fetch('/.netlify/functions/advertiser-campaign-report', {
        method: 'POST',
        headers: await getAuthenticatedJsonHeaders(),
        body: JSON.stringify({ campaignId })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.report) throw new Error(payload.error || 'No se pudo generar el informe');
    return {
        ...payload.report,
        generatedAt: payload.generatedAt,
        timezone: payload.timezone,
        methodology: payload.methodology
    };
}

export async function getAdvertiserCampaigns() {
    const response = await fetch('/.netlify/functions/advertiser-campaign-report', {
        method: 'POST',
        headers: await getAuthenticatedJsonHeaders(),
        body: JSON.stringify({ action: 'list' })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las campañas');
    return payload;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function entries(value, limit = 5) {
    return Object.entries(value || {})
        .map(([label, count]) => [label, Number(count) || 0])
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function formatCampaignCurrency(campaign, value) {
    const currency = String(campaign.currency || 'MXN').toUpperCase();
    try {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
    } catch {
        return `${Number(value || 0).toFixed(2)} ${currency}`;
    }
}

/**
 * Generate a printable HTML report from campaign data
 * @param {Object} data - Report data from getCampaignReportData
 * @returns {string} HTML string
 */
export function generateReportHTML(data) {
    const { campaign, metrics } = data;
    const name = escapeHtml(campaign.advertiser_name || campaign.business_name || 'Campaña');
    const type = campaign.ad_level || campaign.campaign_type || 'N/A';
    const status = campaign.status || 'N/A';
    const topCountries = entries(metrics.byCountry).map(([label, count]) => `<li>${escapeHtml(label)}: <strong>${count.toLocaleString('es-MX')}</strong></li>`).join('');
    const topDevices = entries(metrics.byDevice).map(([label, count]) => `<li>${escapeHtml(label)}: <strong>${count.toLocaleString('es-MX')}</strong></li>`).join('');
    const investment = campaign.total_budget ?? campaign.budget ?? 0;

    return `
        <div style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
                <div style="font-weight:800;color:#2563eb;font-size:20px">Geobooker Ads</div>
                <h1 style="color: #0f172a; margin: 8px 0 0;">Informe de rendimiento publicitario</h1>
                <p style="color: #6b7280; margin-top: 8px;">${name}</p>
                <p style="color: #9ca3af; font-size: 14px;">Generado: ${new Date(data.generatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Tipo de Anuncio</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${escapeHtml(type)}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Estado</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${escapeHtml(status)}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Periodo</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${escapeHtml(campaign.start_date || 'N/A')} a ${escapeHtml(campaign.end_date || 'En curso')}</td>
                </tr>
                <tr><td style="padding:12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">Inversión contratada</td><td style="padding:12px;border:1px solid #e5e7eb">${escapeHtml(formatCampaignCurrency(campaign, investment))}</td></tr>
            </table>

            <h2 style="color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Métricas verificadas</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                <div style="background: #eff6ff; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #1e40af;">${metrics.totalImpressions.toLocaleString('es-MX')}</div>
                    <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Impresiones</div>
                </div>
                <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #16a34a;">${metrics.totalClicks.toLocaleString('es-MX')}</div>
                    <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Clics</div>
                </div>
                <div style="background: #faf5ff; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #7c3aed;">${metrics.ctr}%</div>
                    <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">CTR</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px">
                <div><h3 style="color:#0f172a">Principales países</h3><ol style="color:#475569;line-height:1.7">${topCountries || '<li>Sin datos todavía</li>'}</ol></div>
                <div><h3 style="color:#0f172a">Dispositivos</h3><ol style="color:#475569;line-height:1.7">${topDevices || '<li>Sin datos todavía</li>'}</ol></div>
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:24px;color:#475569;font-size:12px;line-height:1.6">
                <strong>Metodología:</strong> ${escapeHtml(data.methodology || '')} Zona horaria del registro: ${escapeHtml(data.timezone || 'UTC')}.
            </div>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                Geobooker Ads · geobooker.com.mx · hola@geobooker.com.mx
            </p>
        </div>
    `;
}

/**
 * Open the report HTML in a new tab for printing/saving as PDF
 * @param {Object} data - Report data from getCampaignReportData
 */
export async function downloadReportAsPDF(data) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const { campaign, metrics } = data;
    const name = campaign.advertiser_name || 'Campaña';
    const investment = campaign.total_budget ?? campaign.budget ?? 0;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('Geobooker Ads', 16, 16);
    doc.setFontSize(12);
    doc.text('Informe de rendimiento publicitario', 16, 27);
    y = 49;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(String(name).slice(0, 75), 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periodo: ${campaign.start_date || 'N/A'} a ${campaign.end_date || 'En curso'} | Generado: ${new Date(data.generatedAt).toLocaleString('es-MX')}`, 16, y + 7);
    y += 20;

    const cards = [
        ['Impresiones', metrics.totalImpressions],
        ['Clics', metrics.totalClicks],
        ['CTR', `${metrics.ctr}%`],
        ['Días con actividad', metrics.activeDays]
    ];
    cards.forEach(([label, value], index) => {
        const x = 16 + (index % 2) * 91;
        const rowY = y + Math.floor(index / 2) * 27;
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(x, rowY, 84, 21, 3, 3, 'F');
        doc.setTextColor(30, 64, 175);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text(Number.isFinite(value) ? Number(value).toLocaleString('es-MX') : String(value), x + 5, rowY + 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(label, x + 5, rowY + 16);
    });
    y += 61;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Datos de campaña', 16, y);
    y += 8;
    const details = [
        ['Estado', campaign.status || 'N/A'],
        ['Plan', campaign.ad_level || campaign.campaign_type || 'N/A'],
        ['Inversión contratada', formatCampaignCurrency(campaign, investment)],
        ['Promesa de impresiones', Number(campaign.promised_impressions || 0).toLocaleString('es-MX') || 'N/A']
    ];
    doc.setFontSize(9);
    details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 16, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 65, y);
        y += 7;
    });
    y += 4;

    const addBreakdown = (title, values) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(title, 16, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const rows = entries(values);
        (rows.length ? rows : [['Sin datos todavía', 0]]).forEach(([label, value]) => {
            doc.text(`${String(label).slice(0, 55)}: ${Number(value).toLocaleString('es-MX')}`, 20, y);
            y += 6;
        });
        y += 4;
    };
    addBreakdown('Principales países', metrics.byCountry);
    addBreakdown('Dispositivos', metrics.byDevice);

    if (y > 242) { doc.addPage(); y = 20; }
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(16, y, 178, 24, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const methodLines = doc.splitTextToSize(`Metodología: ${data.methodology || ''} Zona horaria: ${data.timezone || 'UTC'}.`, 168);
    doc.text(methodLines, 21, y + 7);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Geobooker Ads · geobooker.com.mx · hola@geobooker.com.mx', pageWidth / 2, 289, { align: 'center' });
    const fileName = `geobooker-informe-${String(name).toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 50) || 'campana'}.pdf`;
    doc.save(fileName);
}
