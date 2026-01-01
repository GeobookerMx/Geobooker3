// src/components/enterprise/CampaignReport.jsx
/**
 * Campaign Performance Report Component
 * Shows metrics, charts, and allows PDF export
 * For enterprise advertisers to see their campaign performance
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Eye, MousePointer, Percent, TrendingUp, Calendar,
    Download, Globe, MapPin, Smartphone, Monitor, Tablet,
    Clock, BarChart3, PieChart, ArrowUp, ArrowDown, Loader2,
    FileText, Sparkles, Lightbulb, Target, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Función para generar sugerencias de IA basadas en métricas
const generateAISuggestions = (report, dailyMetrics) => {
    const suggestions = [];
    const ctr = report?.metrics?.ctr_percent || 0;
    const totalImpressions = report?.metrics?.total_impressions || 0;
    const totalClicks = report?.metrics?.total_clicks || 0;

    // Sugerencia basada en CTR
    if (ctr < 0.5) {
        suggestions.push({
            type: 'ctr_low',
            icon: '💡',
            title: 'CTR por debajo del promedio',
            text: `Tu CTR actual (${ctr}%) está por debajo del promedio de la industria (0.5%). Considera usar un CTA más directo como "Obtén 20% OFF" o cambiar la imagen principal para captar más atención.`,
            priority: 'high'
        });
    } else if (ctr >= 1.0) {
        suggestions.push({
            type: 'ctr_excellent',
            icon: '🎉',
            title: '¡Excelente CTR!',
            text: `Tu CTR de ${ctr}% está muy por encima del promedio. Tu creatividad está funcionando muy bien. Considera aumentar el presupuesto para maximizar el alcance.`,
            priority: 'success'
        });
    }

    // Sugerencia basada en días de la semana
    if (dailyMetrics && dailyMetrics.length >= 7) {
        const weekendImpressions = dailyMetrics.filter(d => {
            const day = new Date(d.date).getDay();
            return day === 0 || day === 6;
        }).reduce((sum, d) => sum + (d.impressions || 0), 0);

        const weekdayImpressions = dailyMetrics.filter(d => {
            const day = new Date(d.date).getDay();
            return day >= 1 && day <= 5;
        }).reduce((sum, d) => sum + (d.impressions || 0), 0);

        if (weekendImpressions > weekdayImpressions * 0.6) {
            suggestions.push({
                type: 'weekend_strong',
                icon: '📅',
                title: 'Fines de semana destacados',
                text: 'Tus anuncios tienen mayor engagement los fines de semana. Considera concentrar mayor presupuesto en sábado y domingo para maximizar resultados.',
                priority: 'medium'
            });
        }
    }

    // Sugerencia sobre dispositivos (asumimos 70% mobile por defecto en LatAm)
    suggestions.push({
        type: 'mobile_focus',
        icon: '📱',
        title: 'Optimiza para móvil',
        text: 'El 70% de tu audiencia probablemente usa móvil. Asegúrate de que tu landing page cargue en menos de 3 segundos y tenga botón de WhatsApp visible.',
        priority: 'medium'
    });

    // Sugerencia de expansión si hay buen rendimiento
    if (totalImpressions > 10000 && ctr >= 0.5) {
        suggestions.push({
            type: 'expand_regions',
            icon: '🌍',
            title: 'Considera expandir regiones',
            text: 'Con buenos resultados en tu campaña actual, podrías considerar expandir a nuevas ciudades o regiones para aumentar tu alcance.',
            priority: 'low'
        });
    }

    return suggestions;
};

export default function CampaignReport({ campaignId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [dailyMetrics, setDailyMetrics] = useState([]);
    const reportRef = useRef(null);

    useEffect(() => {
        if (campaignId) loadReport();
    }, [campaignId]);

    const loadReport = async () => {
        setLoading(true);
        try {
            // Get campaign report
            const { data: reportData, error: reportError } = await supabase.rpc('get_campaign_report', {
                p_campaign_id: campaignId
            });
            if (reportError) throw reportError;
            setReport(reportData);

            // Get daily metrics for chart
            const { data: dailyData, error: dailyError } = await supabase.rpc('get_campaign_daily_metrics', {
                p_campaign_id: campaignId,
                p_days: 30
            });
            if (!dailyError) setDailyMetrics(dailyData || []);

        } catch (error) {
            console.error('Error loading report:', error);
            toast.error('Error loading report');
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = async () => {
        // Using browser print to PDF
        const printContent = reportRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Campaign Report - ${report?.campaign?.advertiser || 'Campaign'}</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 40px; 
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .header { 
                        border-bottom: 3px solid #3B82F6; 
                        padding-bottom: 20px; 
                        margin-bottom: 30px; 
                    }
                    .logo { font-size: 24px; font-weight: bold; color: #3B82F6; }
                    .title { font-size: 28px; font-weight: bold; margin: 20px 0 10px; }
                    .subtitle { color: #666; }
                    .metrics-grid { 
                        display: grid; 
                        grid-template-columns: repeat(3, 1fr); 
                        gap: 20px; 
                        margin: 30px 0;
                    }
                    .metric-card { 
                        background: #f8f9fa; 
                        padding: 20px; 
                        border-radius: 8px;
                        text-align: center;
                    }
                    .metric-value { 
                        font-size: 32px; 
                        font-weight: bold; 
                        color: #3B82F6; 
                    }
                    .metric-label { color: #666; font-size: 14px; margin-top: 5px; }
                    .section { margin: 30px 0; }
                    .section-title { 
                        font-size: 18px; 
                        font-weight: bold; 
                        border-bottom: 1px solid #ddd; 
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
                    th { background: #f8f9fa; }
                    .footer { 
                        margin-top: 40px; 
                        padding-top: 20px; 
                        border-top: 1px solid #ddd; 
                        text-align: center; 
                        color: #999;
                        font-size: 12px;
                    }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">📊 Geobooker Ads</div>
                    <div class="title">Campaign Performance Report</div>
                    <div class="subtitle">
                        ${report?.campaign?.advertiser || 'Campaign'} | 
                        ${report?.period?.from || ''} to ${report?.period?.to || ''}
                    </div>
                </div>

                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${formatNumber(report?.metrics?.total_impressions || 0)}</div>
                        <div class="metric-label">Total Impressions</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${formatNumber(report?.metrics?.total_clicks || 0)}</div>
                        <div class="metric-label">Total Clicks</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report?.metrics?.ctr_percent || 0}%</div>
                        <div class="metric-label">Click-Through Rate</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Campaign Details</div>
                    <table>
                        <tr><th>Status</th><td>${report?.campaign?.status || 'N/A'}</td></tr>
                        <tr><th>Start Date</th><td>${report?.campaign?.start_date || 'N/A'}</td></tr>
                        <tr><th>End Date</th><td>${report?.campaign?.end_date || 'Ongoing'}</td></tr>
                        <tr><th>Budget</th><td>$${report?.campaign?.budget_usd || 0} USD</td></tr>
                        <tr><th>Active Days</th><td>${report?.metrics?.active_days || 0}</td></tr>
                        <tr><th>Avg. Daily Impressions</th><td>${formatNumber(report?.metrics?.avg_daily_impressions || 0)}</td></tr>
                    </table>
                </div>

                <div class="footer">
                    Generated by Geobooker Ads | ${new Date().toLocaleString()}<br>
                    geobooker.com.mx | enterprise@geobooker.com.mx
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Simple bar chart using CSS
    const maxImpressions = Math.max(...dailyMetrics.map(d => d.impressions || 0), 1);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
                    <p className="text-gray-400 mt-4">Loading report...</p>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl p-8 text-center">
                    <p className="text-red-400">No report data available</p>
                    <button onClick={onClose} className="mt-4 text-blue-400 hover:underline">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div ref={reportRef} className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 text-blue-200 text-sm mb-2">
                                <BarChart3 className="w-4 h-4" />
                                Campaign Performance Report
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {report.campaign?.advertiser || 'Campaign Report'}
                            </h2>
                            <p className="text-blue-100 mt-1">
                                {report.period?.from} → {report.period?.to}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={exportToPDF}
                                className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition"
                            >
                                <Download className="w-4 h-4" />
                                Export PDF
                            </button>
                            <button
                                onClick={onClose}
                                className="text-white/80 hover:text-white px-3 py-2"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Metrics */}
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gray-900 rounded-xl p-4 text-center">
                            <Eye className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">
                                {formatNumber(report.metrics?.total_impressions || 0)}
                            </div>
                            <div className="text-gray-400 text-sm">Impressions</div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 text-center">
                            <MousePointer className="w-6 h-6 text-green-400 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">
                                {formatNumber(report.metrics?.total_clicks || 0)}
                            </div>
                            <div className="text-gray-400 text-sm">Clicks</div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 text-center">
                            <Percent className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">
                                {report.metrics?.ctr_percent || 0}%
                            </div>
                            <div className="text-gray-400 text-sm">CTR</div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 text-center">
                            <Calendar className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">
                                {report.metrics?.active_days || 0}
                            </div>
                            <div className="text-gray-400 text-sm">Active Days</div>
                        </div>
                    </div>

                    {/* Daily Performance Chart */}
                    <div className="bg-gray-900 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            Daily Performance
                        </h3>

                        {dailyMetrics.length > 0 ? (
                            <div className="space-y-2">
                                {dailyMetrics.slice(0, 14).reverse().map((day, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-20 text-xs text-gray-500">
                                            {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full flex items-center justify-end pr-2"
                                                style={{ width: `${Math.max((day.impressions / maxImpressions) * 100, 5)}%` }}
                                            >
                                                <span className="text-xs text-white font-medium">
                                                    {formatNumber(day.impressions)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-16 text-right text-xs text-gray-400">
                                            {day.clicks} clicks
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                No daily data available yet. Metrics will appear as your campaign runs.
                            </div>
                        )}
                    </div>

                    {/* Contract & Campaign Details */}
                    <div className="bg-gray-900 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            Contract & Campaign Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Número de Contrato */}
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-gray-400">Contract Number</span>
                                <span className="text-amber-400 font-mono font-medium">
                                    {report.campaign?.contract_number || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-gray-400">Status</span>
                                <span className={`font-medium ${report.campaign?.status === 'active' ? 'text-green-400' :
                                    report.campaign?.status === 'pending_review' ? 'text-yellow-400' :
                                        'text-gray-400'
                                    }`}>
                                    {report.campaign?.status}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-gray-400">Budget</span>
                                <span className="text-white font-medium">
                                    {formatCurrency(report.campaign?.budget_usd || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-gray-400">Promised Impressions</span>
                                <span className="text-white">
                                    {formatNumber(report.campaign?.promised_impressions || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-gray-400">Start Date</span>
                                <span className="text-white">{report.campaign?.start_date}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-gray-400">End Date</span>
                                <span className="text-white">{report.campaign?.end_date || 'Ongoing'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-gray-400">Avg. Daily Impressions</span>
                                <span className="text-white">{formatNumber(report.metrics?.avg_daily_impressions || 0)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-700">
                                <span className="text-gray-400">Cost per Click (est.)</span>
                                <span className="text-white">
                                    {report.metrics?.total_clicks > 0
                                        ? formatCurrency((report.campaign?.budget_usd || 0) / report.metrics.total_clicks)
                                        : 'N/A'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Target Regions */}
                    {report.campaign?.target_regions && report.campaign.target_regions.length > 0 && (
                        <div className="bg-gray-900 rounded-xl p-6 mb-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-green-400" />
                                Target Regions
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {(report.campaign.target_regions || []).map((region, idx) => (
                                    <span key={idx} className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {region}
                                    </span>
                                ))}
                            </div>
                            {report.campaign?.target_countries && (
                                <div className="mt-3 text-gray-400 text-sm">
                                    Countries: {report.campaign.target_countries.join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI Suggestions */}
                    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/30">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            AI Recommendations
                            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Powered by Geobooker AI</span>
                        </h3>
                        <div className="space-y-4">
                            {generateAISuggestions(report, dailyMetrics).map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-lg border ${suggestion.priority === 'high' ? 'bg-red-900/20 border-red-500/30' :
                                            suggestion.priority === 'success' ? 'bg-green-900/20 border-green-500/30' :
                                                'bg-gray-800/50 border-gray-600/30'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{suggestion.icon}</span>
                                        <div>
                                            <h4 className="font-semibold text-white mb-1">{suggestion.title}</h4>
                                            <p className="text-gray-300 text-sm">{suggestion.text}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-700 text-center text-gray-500 text-sm">
                    Report generated at {new Date().toLocaleString()} | Geobooker Enterprise
                </div>
            </div>
        </div>
    );
}
