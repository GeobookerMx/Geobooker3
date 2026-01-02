// src/services/reportService.js
/**
 * Servicio para generar informes de rendimiento de campañas
 * Genera datos para PDF y envío por email
 */
import { supabase } from '../lib/supabase';

/**
 * Obtiene métricas completas de una campaña para el informe
 */
export async function getCampaignReportData(campaignId) {
    try {
        // Obtener datos de la campaña
        const { data: campaign, error: campaignError } = await supabase
            .from('ad_campaigns')
            .select(`
                *,
                ad_spaces (name, display_name, type),
                ad_creatives (title, description, image_url)
            `)
            .eq('id', campaignId)
            .single();

        if (campaignError) throw campaignError;

        // Obtener analytics diarios
        const { data: dailyAnalytics, error: analyticsError } = await supabase
            .from('ad_analytics')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('date', { ascending: true });

        if (analyticsError) console.error('Analytics error:', analyticsError);

        // Calcular métricas totales
        const totalImpressions = dailyAnalytics?.reduce((sum, d) => sum + (d.impressions || 0), 0) || campaign.impressions || 0;
        const totalClicks = dailyAnalytics?.reduce((sum, d) => sum + (d.clicks || 0), 0) || campaign.clicks || 0;
        const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;

        // Calcular días activos
        const startDate = new Date(campaign.start_date);
        const endDate = new Date(campaign.end_date || new Date());
        const daysActive = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        // Promedio diario
        const avgDailyImpressions = daysActive > 0 ? Math.round(totalImpressions / daysActive) : 0;
        const avgDailyClicks = daysActive > 0 ? Math.round(totalClicks / daysActive) : 0;

        return {
            campaign: {
                id: campaign.id,
                advertiserName: campaign.advertiser_name,
                advertiserEmail: campaign.advertiser_email,
                adSpace: campaign.ad_spaces?.display_name || 'N/A',
                adSpaceType: campaign.ad_spaces?.type || 'N/A',
                startDate: campaign.start_date,
                endDate: campaign.end_date,
                status: campaign.status,
                budget: campaign.budget || campaign.total_budget,
                targetLocation: campaign.target_location,
                targetCategory: campaign.target_category,
                createdAt: campaign.created_at
            },
            creative: campaign.ad_creatives?.[0] || {
                title: campaign.headline,
                description: campaign.description,
                image_url: campaign.creative_url
            },
            metrics: {
                totalImpressions,
                totalClicks,
                avgCTR: parseFloat(avgCTR),
                daysActive,
                avgDailyImpressions,
                avgDailyClicks
            },
            dailyData: dailyAnalytics || [],
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting campaign report data:', error);
        throw error;
    }
}

/**
 * Genera HTML del informe para convertir a PDF
 */
export function generateReportHTML(reportData) {
    const { campaign, creative, metrics, generatedAt } = reportData;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Informe de Campaña - ${campaign.advertiserName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 40px; }
        .header { background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .logo { font-weight: bold; font-size: 20px; margin-bottom: 20px; }
        .section { background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
        .section-title { font-size: 16px; font-weight: 600; color: #3B82F6; margin-bottom: 16px; border-bottom: 2px solid #3B82F6; padding-bottom: 8px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
        .metric-value { font-size: 32px; font-weight: bold; color: #3B82F6; }
        .metric-label { font-size: 12px; color: #666; margin-top: 4px; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { font-weight: 500; color: #666; }
        .info-value { font-weight: 600; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .highlight { background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
        .note { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 13px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">📍 Geobooker</div>
        <h1>Informe de Rendimiento de Campaña</h1>
        <p>Generado el ${new Date(generatedAt).toLocaleDateString('es-MX', { dateStyle: 'full' })}</p>
    </div>

    <div class="section">
        <div class="section-title">📋 Información de la Campaña</div>
        <div class="info-row">
            <span class="info-label">Anunciante</span>
            <span class="info-value">${campaign.advertiserName}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Espacio Publicitario</span>
            <span class="info-value">${campaign.adSpace}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Periodo</span>
            <span class="info-value">${new Date(campaign.startDate).toLocaleDateString('es-MX')} - ${campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('es-MX') : 'En curso'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Ubicación Objetivo</span>
            <span class="info-value">${campaign.targetLocation || 'Nacional'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Estado</span>
            <span class="info-value"><span class="highlight">${campaign.status.toUpperCase()}</span></span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📊 Métricas de Rendimiento</div>
        <div class="grid">
            <div class="metric">
                <div class="metric-value">${metrics.totalImpressions.toLocaleString()}</div>
                <div class="metric-label">Impresiones Totales</div>
            </div>
            <div class="metric">
                <div class="metric-value">${metrics.totalClicks.toLocaleString()}</div>
                <div class="metric-label">Clics Totales</div>
            </div>
            <div class="metric">
                <div class="metric-value">${metrics.avgCTR}%</div>
                <div class="metric-label">CTR Promedio</div>
            </div>
            <div class="metric">
                <div class="metric-value">${metrics.daysActive}</div>
                <div class="metric-label">Días Activos</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📈 Promedios Diarios</div>
        <div class="grid">
            <div class="metric">
                <div class="metric-value">${metrics.avgDailyImpressions.toLocaleString()}</div>
                <div class="metric-label">Impresiones / Día</div>
            </div>
            <div class="metric">
                <div class="metric-value">${metrics.avgDailyClicks.toLocaleString()}</div>
                <div class="metric-label">Clics / Día</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">🎨 Creativo Utilizado</div>
        <div class="info-row">
            <span class="info-label">Título</span>
            <span class="info-value">${creative?.title || 'N/A'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Descripción</span>
            <span class="info-value">${creative?.description || 'N/A'}</span>
        </div>
    </div>

    <div class="note">
        <strong>📌 Nota de Transparencia:</strong> Este informe refleja las métricas reales registradas durante el periodo de la campaña. 
        Geobooker no garantiza métricas específicas, pero se compromete a proporcionar datos precisos y transparentes.
    </div>

    <div class="footer">
        <p>© ${new Date().getFullYear()} Geobooker - Tu directorio de negocios locales</p>
        <p>geobooker.com.mx | geobookerr@gmail.com</p>
    </div>
</body>
</html>
    `;
}

/**
 * Descarga el informe como PDF (usando window.print)
 */
export function downloadReportAsPDF(reportData) {
    const html = generateReportHTML(reportData);

    // Crear ventana temporal para imprimir
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();

    // Esperar a que cargue y luego imprimir
    printWindow.onload = function () {
        printWindow.print();
    };
}

export default {
    getCampaignReportData,
    generateReportHTML,
    downloadReportAsPDF
};
