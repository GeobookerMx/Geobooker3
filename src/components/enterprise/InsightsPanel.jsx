// src/components/enterprise/InsightsPanel.jsx
/**
 * Smart Insights Panel for Advertiser Dashboard
 * Shows AI-powered recommendations and performance analysis
 */
import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Calendar, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

export default function InsightsPanel({ campaigns, stats }) {
    const insights = generateInsights(campaigns, stats);

    if (insights.length === 0) {
        return (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    Insights
                </h3>
                <p className="text-gray-400 text-sm">
                    Los insights aparecerán cuando tus campañas tengan datos suficientes.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                💡 Insights Inteligentes
                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full ml-auto">
                    Powered by AI
                </span>
            </h3>

            <div className="space-y-3">
                {insights.map((insight, idx) => (
                    <div
                        key={idx}
                        className={`p-4 rounded-lg border ${insight.type === 'success' ? 'bg-green-900/20 border-green-500/30' :
                                insight.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30' :
                                    insight.type === 'info' ? 'bg-blue-900/20 border-blue-500/30' :
                                        'bg-gray-800/50 border-gray-600/30'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{insight.icon}</span>
                            <div className="flex-1">
                                <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                                <p className="text-gray-300 text-sm">{insight.message}</p>
                                {insight.action && (
                                    <button className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
                                        {insight.action}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Generate smart insights based on campaign data
function generateInsights(campaigns, stats) {
    const insights = [];

    if (!campaigns || campaigns.length === 0) return insights;

    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    const avgCtr = parseFloat(stats.avgCtr) || 0;

    // Insight 1: CTR Performance
    if (avgCtr > 0.8) {
        insights.push({
            type: 'success',
            icon: '🎉',
            title: '¡Excelente CTR!',
            message: `Tu CTR promedio de ${avgCtr}% está muy por encima del promedio de la industria (0.5%). Tus anuncios están resonando muy bien con la audiencia.`
        });
    } else if (avgCtr > 0 && avgCtr < 0.4) {
        insights.push({
            type: 'warning',
            icon: '💡',
            title: 'CTR por debajo del promedio',
            message: `Tu CTR actual (${avgCtr}%) está por debajo del promedio. Considera usar un llamado a la acción más directo como "Obtén 20% OFF" o cambiar la imagen principal.`,
            action: 'Ver tips de optimización →'
        });
    }

    // Insight 2: Campaign ending soon
    const endingSoon = activeCampaigns.filter(c => {
        if (!c.end_date) return false;
        const daysLeft = Math.ceil((new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 && daysLeft <= 7;
    });

    if (endingSoon.length > 0) {
        endingSoon.forEach(campaign => {
            const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24));
            insights.push({
                type: 'warning',
                icon: '⏰',
                title: `Campaña "${campaign.advertiser_name}" termina en ${daysLeft} días`,
                message: '¿Quieres renovar para seguir llegando a tu audiencia? Renueva ahora y obtén un descuento especial.',
                action: 'Renovar campaña →'
            });
        });
    }

    // Insight 3: Mobile-first reminder
    insights.push({
        type: 'info',
        icon: '📱',
        title: 'Optimiza para móvil',
        message: 'El 70% de tu audiencia probablemente usa móvil. Asegúrate de que tu landing page cargue rápido (< 3 segundos) y tenga un botón de WhatsApp visible.'
    });

    // Insight 4: Budget utilization (if data available)
    activeCampaigns.forEach(campaign => {
        if (campaign.impressions && campaign.promised_impressions) {
            const progress = (campaign.impressions / campaign.promised_impressions) * 100;
            const daysTotal = Math.ceil((new Date(campaign.end_date) - new Date(campaign.start_date)) / (1000 * 60 * 60 * 24));
            const daysPassed = Math.ceil((new Date() - new Date(campaign.start_date)) / (1000 * 60 * 60 * 24));
            const timeProgress = (daysPassed / daysTotal) * 100;

            if (progress > timeProgress + 20) {
                insights.push({
                    type: 'success',
                    icon: '🚀',
                    title: `Campaña "${campaign.advertiser_name}" acelera`,
                    message: `Estás ${Math.round(progress - timeProgress)}% adelante del ritmo proyectado. ¡Excelente! Tu campaña está generando más impacto del esperado.`
                });
            } else if (progress < timeProgress - 20) {
                insights.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: `Campaña "${campaign.advertiser_name}" atrasada`,
                    message: `Estás ${Math.round(timeProgress - progress)}% por debajo del ritmo esperado. Contacta a soporte para optimizar tu campaña.`,
                    action: 'Contactar soporte →'
                });
            }
        }
    });

    // Insight 5: First impressions milestone
    if (stats.totalImpressions > 10000 && stats.totalImpressions < 15000) {
        insights.push({
            type: 'success',
            icon: '🎯',
            title: '¡10,000 impresiones alcanzadas!',
            message: 'Has superado las 10K impresiones. Este es un gran hito. Con estos datos ya puedes analizar patrones y optimizar tu estrategia.'
        });
    }

    return insights.slice(0, 5); // Max 5 insights to avoid overwhelming
}
