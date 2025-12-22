// src/components/gamification/UserLevelCard.jsx
/**
 * Shows user's current level, progress bar, and rewards
 * Gamified UI with animations and attractive design
 */
import React, { useState, useEffect } from 'react';
import { Gift, ChevronRight, Sparkles, Star, Trophy, Zap, Crown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const LEVEL_COLORS = {
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    diamond: 'from-cyan-400 to-blue-500',
    platinum: 'from-purple-400 to-pink-500'
};

const LEVEL_BG = {
    bronze: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200',
    silver: 'bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200',
    gold: 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200',
    diamond: 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200',
    platinum: 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
};

export default function UserLevelCard({ variant = 'full' }) {
    const { user } = useAuth();
    const [levelInfo, setLevelInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadLevelInfo();
    }, [user]);

    const loadLevelInfo = async () => {
        try {
            const { data, error } = await supabase.rpc('get_user_level_info', {
                p_user_id: user.id
            });

            if (error) throw error;
            setLevelInfo(data);
        } catch (error) {
            console.error('Error loading level info:', error);
            // Fallback to default level 1
            setLevelInfo({
                current_level: { number: 1, name: 'Explorer', name_es: 'Explorador', icon: '🥉', color: 'bronze' },
                next_level: { number: 2, name: 'Promoter', name_es: 'Promotor', icon: '🥈', min_referrals: 3 },
                referrals: 0,
                progress: 0,
                referrals_needed: 3,
                pending_rewards: []
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse bg-gray-100 rounded-2xl h-48"></div>
        );
    }

    if (!levelInfo) return null;

    const { current_level, next_level, referrals, progress, referrals_needed, pending_rewards } = levelInfo;
    const color = current_level?.color || 'bronze';

    // Compact badge variant
    if (variant === 'badge') {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r ${LEVEL_COLORS[color]} text-white shadow-lg`}>
                <span>{current_level?.icon}</span>
                <span>{current_level?.name_es}</span>
            </div>
        );
    }

    // Mini variant for sidebar
    if (variant === 'mini') {
        return (
            <div className={`p-3 rounded-xl border-2 ${LEVEL_BG[color]}`}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{current_level?.icon}</span>
                    <div>
                        <p className="text-xs text-gray-500">Tu nivel</p>
                        <p className="font-bold text-gray-800">{current_level?.name_es}</p>
                    </div>
                </div>
                {next_level && (
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${LEVEL_COLORS[color]} transition-all duration-500`}
                            style={{ width: `${Math.max(progress || 0, 5)}%` }}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Full card variant
    return (
        <div className={`rounded-2xl border-2 overflow-hidden ${LEVEL_BG[color]}`}>
            {/* Header */}
            <div className={`bg-gradient-to-r ${LEVEL_COLORS[color]} p-4 text-white`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-3xl">
                            {current_level?.icon}
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Tu nivel actual</p>
                            <h3 className="text-xl font-bold">{current_level?.name_es}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-white/80 text-sm">Referidos</p>
                        <p className="text-2xl font-bold">{referrals || 0}</p>
                    </div>
                </div>
            </div>

            {/* Progress section */}
            <div className="p-4">
                {next_level ? (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                                Próximo nivel: <strong>{next_level.icon} {next_level.name_es}</strong>
                            </span>
                            <span className="text-sm font-bold text-gray-800">
                                {referrals_needed} más
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                            <div
                                className={`h-full bg-gradient-to-r ${LEVEL_COLORS[color]} transition-all duration-500`}
                                style={{ width: `${Math.max(progress || 0, 5)}%` }}
                            />
                        </div>

                        {/* Next level rewards preview */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Gift className="w-4 h-4" />
                            <span>Al subir: </span>
                            {next_level.rewards?.free_ad_days && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                    📢 {next_level.rewards.free_ad_days} días de anuncio
                                </span>
                            )}
                            {next_level.rewards?.premium_days && (
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                    ⭐ {next_level.rewards.premium_days} días Premium
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <p className="font-bold text-gray-800">¡Nivel máximo alcanzado!</p>
                        <p className="text-sm text-gray-500">Eres una leyenda de Geobooker</p>
                    </div>
                )}

                {/* Pending rewards */}
                {pending_rewards && pending_rewards.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <p className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            ¡Tienes {pending_rewards.length} recompensa(s) pendiente(s)!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
