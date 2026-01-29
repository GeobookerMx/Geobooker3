// src/components/enterprise/ShareOfVoiceWidget.jsx
/**
 * Share of Voice Widget
 * Shows advertiser's market share in their category
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Target, TrendingUp, Users, Award } from 'lucide-react';

export default function ShareOfVoiceWidget({ campaignId }) {
    const [loading, setLoading] = useState(true);
    const [sovData, setSovData] = useState(null);

    useEffect(() => {
        if (campaignId) loadShareOfVoice();
    }, [campaignId]);

    const loadShareOfVoice = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('get_share_of_voice', { p_campaign_id: campaignId });

            if (error) {
                console.error('Error loading SOV:', error);
            } else if (data && data.length > 0) {
                setSovData(data[0]);
            }
        } catch (err) {
            console.error('SOV error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-20 bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (!sovData || sovData.share_of_voice_percent === null) {
        return null; // Don't show if no data
    }

    const sov = parseFloat(sovData.share_of_voice_percent) || 0;
    const rank = sovData.my_rank || 0;
    const totalCompetitors = sovData.total_competitors || 0;
    const categoryName = sovData.category_name || 'tu categoría';

    // Determine ranking badge
    const getRankBadge = () => {
        if (rank === 1) return { emoji: '🥇', text: '#1', color: 'text-yellow-400' };
        if (rank === 2) return { emoji: '🥈', text: '#2', color: 'text-gray-300' };
        if (rank === 3) return { emoji: '🥉', text: '#3', color: 'text-orange-400' };
        return { emoji: '📊', text: `#${rank}`, color: 'text-blue-400' };
    };

    const badge = getRankBadge();

    return (
        <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/40 rounded-xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Share of Voice
                </h3>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {categoryName}
                </span>
            </div>

            {/* Main SOV Display */}
            <div className="text-center mb-6">
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
                    {sov.toFixed(1)}%
                </div>
                <p className="text-gray-400 text-sm">
                    de todas las impresiones en tu categoría
                </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Tu share</span>
                    <span>{sovData.my_impressions?.toLocaleString()} impresiones</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.min(sov, 100)}%` }}
                    >
                        {sov > 15 && (
                            <span className="text-[10px] text-white font-bold">
                                {sov.toFixed(0)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <div className={`text-2xl font-bold ${badge.color} mb-1`}>
                        {badge.emoji} {badge.text}
                    </div>
                    <div className="text-xs text-gray-400">Tu ranking</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                        {totalCompetitors}
                    </div>
                    <div className="text-xs text-gray-400">Competidores</div>
                </div>
            </div>

            {/* Insight Message */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                    {rank === 1 && sov > 30 ? (
                        <>
                            <Award className="w-4 h-4 inline mr-1" />
                            <strong>¡Eres el líder!</strong> Dominas {sov.toFixed(0)}% del mercado.
                            Pocos anunciantes = más visibilidad para ti.
                        </>
                    ) : rank <= 3 ? (
                        <>
                            <TrendingUp className="w-4 h-4 inline mr-1" />
                            Estás en el <strong>Top 3</strong> de tu categoría. Considera aumentar
                            presupuesto para alcanzar el #1.
                        </>
                    ) : (
                        <>
                            <Users className="w-4 h-4 inline mr-1" />
                            Hay espacio para crecer. Con {totalCompetitors} anunciantes,
                            incrementar tu inversión te ayudará a destacar más.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
