import { supabase } from '../lib/supabase';

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

            const { data, error } = await supabase
                .from('content_reports')
                .insert({
                    reporter_id: user?.id || null, // Allow anonymous reporting if config allows
                    content_type,
                    content_id,
                    reason,
                    details,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });

            if (error) {
                // Fallback to business_reports if content_reports doesn't exist yet
                // and content_type is business
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
            const { data, error } = await supabase
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
    // Fetch campaign details
    const { data: campaign, error: campError } = await supabase
        .from('ad_purchases')
        .select('*')
        .eq('id', campaignId)
        .single();

    if (campError) throw campError;

    // Fetch impression/click data
    const { data: impressions, error: impError } = await supabase
        .from('ad_impressions')
        .select('*')
        .eq('ad_purchase_id', campaignId)
        .order('recorded_at', { ascending: false });

    const totalImpressions = impressions?.length || 0;
    const totalClicks = impressions?.filter(i => i.clicked)?.length || 0;
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

    return {
        campaign,
        metrics: {
            totalImpressions,
            totalClicks,
            ctr,
            startDate: campaign.start_date,
            endDate: campaign.end_date
        },
        impressions: impressions || [],
        generatedAt: new Date().toISOString()
    };
}

/**
 * Generate a printable HTML report from campaign data
 * @param {Object} data - Report data from getCampaignReportData
 * @returns {string} HTML string
 */
export function generateReportHTML(data) {
    const { campaign, metrics } = data;
    const name = campaign.advertiser_name || campaign.business_name || 'Campaña';
    const type = campaign.ad_type || 'N/A';
    const status = campaign.status || 'N/A';

    return `
        <div style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
                <h1 style="color: #1e40af; margin: 0;">📊 Informe de Campaña</h1>
                <p style="color: #6b7280; margin-top: 8px;">${name}</p>
                <p style="color: #9ca3af; font-size: 14px;">Generado: ${new Date(data.generatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Tipo de Anuncio</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${type}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Estado</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${status}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">Periodo</td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${metrics.startDate || 'N/A'} → ${metrics.endDate || 'N/A'}</td>
                </tr>
            </table>

            <h2 style="color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Métricas de Rendimiento</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                <div style="background: #eff6ff; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #1e40af;">${metrics.totalImpressions.toLocaleString()}</div>
                    <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Impresiones</div>
                </div>
                <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #16a34a;">${metrics.totalClicks.toLocaleString()}</div>
                    <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Clics</div>
                </div>
                <div style="background: #faf5ff; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #7c3aed;">${metrics.ctr}%</div>
                    <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">CTR</div>
                </div>
            </div>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                Geobooker — Directorio de Negocios Locales • geobooker.com.mx
            </p>
        </div>
    `;
}

/**
 * Open the report HTML in a new tab for printing/saving as PDF
 * @param {Object} data - Report data from getCampaignReportData
 */
export function downloadReportAsPDF(data) {
    const html = generateReportHTML(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Informe - ${data.campaign.advertiser_name || 'Campaña'}</title>
                <style>
                    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>${html}</body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }
}
