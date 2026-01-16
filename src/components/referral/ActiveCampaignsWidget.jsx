// Widget de Campañas Activas por Puntos Canjeados
// src/components/referral/ActiveCampaignsWidget.jsx

import React, { useState, useEffect } from 'react';
import { TrendingUp, Eye, MousePointer, Calendar, MapPin, Tag, Pause, Play, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ActiveCampaignsWidget = ({ userId }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCampaigns();

        // Refresh cada 30 segundos
        const interval = setInterval(loadCampaigns, 30000);
        return () => clearInterval(interval);
    }, [userId]);

    const loadCampaigns = async () => {
        try {
            const { data, error } = await supabase
                .from('active_reward_campaigns')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;
            setCampaigns(data || []);
        } catch (error) {
            console.error('Error loading campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const cancelCampaign = async (campaignId) => {
        if (!confirm('¿Seguro que deseas cancelar esta campaña?')) return;

        try {
            const { error } = await supabase
                .from('reward_redemptions')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', campaignId);

            if (error) throw error;

            toast.success('Campaña cancelada');
            loadCampaigns();
        } catch (error) {
            console.error('Cancel error:', error);
            toast.error('Error al cancelar');
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-center text-gray-500">Cargando campañas...</p>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-gray-900 mb-2">📊 Campañas Activas</h3>
                <p className="text-gray-500 text-sm">No tienes campañas activas. ¡Canjea puntos por ads!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">📊 Campañas Activas ({campaigns.length})</h3>

            {campaigns.map((campaign) => {
                const ctr = campaign.ctr || 0;
                const daysLeft = campaign.days_remaining;
                const progress = ((campaign.duration_days - daysLeft) / campaign.duration_days) * 100;

                return (
                    <div key={campaign.id} className="bg-white rounded-xl shadow-sm border p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg">{campaign.business_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">
                                        {campaign.reward_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Costo: {campaign.points_cost} pts
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => cancelCampaign(campaign.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Cancelar campaña"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Métricas */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Eye className="w-4 h-4 text-gray-500" />
                                    <p className="text-sm text-gray-600">Impresiones</p>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{campaign.impressions.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <MousePointer className="w-4 h-4 text-gray-500" />
                                    <p className="text-sm text-gray-600">Clicks</p>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{campaign.clicks}</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <TrendingUp className="w-4 h-4 text-gray-500" />
                                    <p className="text-sm text-gray-600">CTR</p>
                                </div>
                                <p className={`text-2xl font-bold ${ctr > 2 ? 'text-green-600' : ctr > 1 ? 'text-yellow-600' : 'text-gray-600'
                                    }`}>
                                    {ctr.toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        {/* Targeting Info */}
                        {(campaign.target_city || campaign.target_category) && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {campaign.target_city && (
                                    <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                        <MapPin className="w-4 h-4" />
                                        {campaign.target_city}
                                    </div>
                                )}
                                {campaign.target_category && (
                                    <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                                        <Tag className="w-4 h-4" />
                                        {campaign.target_category}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">Progreso de campaña</span>
                                <span className="font-medium text-gray-900">
                                    {daysLeft} días restantes
                                </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Expira: {new Date(campaign.expires_at).toLocaleDateString('es-MX', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ActiveCampaignsWidget;
