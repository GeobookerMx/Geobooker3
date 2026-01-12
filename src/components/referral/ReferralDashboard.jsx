// src/components/referral/ReferralDashboard.jsx
/**
 * Dashboard de Referidos - Muestra estadísticas, referidos y recompensas
 * Se usa en el Dashboard del usuario o como modal
 */
import React, { useState, useEffect } from 'react';
import {
    Gift, Users, Star, Trophy,
    MessageCircle, Copy, Check,
    ChevronRight, Sparkles, Crown,
    TrendingUp, Clock, Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ReferralDashboard({ isModal = false, onClose = null }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [profile, setProfile] = useState(null);
    const [referrals, setReferrals] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [levelInfo, setLevelInfo] = useState(null);
    const [allLevels, setAllLevels] = useState([]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Cargar info de nivel vía RPC (fuente de verdad)
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_user_level_info', { p_user_id: user.id });

            if (!rpcError && rpcData) {
                setLevelInfo(rpcData);
            }

            // 2. Cargar todos los niveles disponibles
            const { data: levelsData } = await supabase
                .from('user_levels')
                .select('*')
                .order('level_number', { ascending: true });

            if (levelsData) setAllLevels(levelsData);

            // 3. Cargar perfil para datos adicionales
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('referral_code, referral_count, referral_points, is_premium, premium_until')
                .eq('id', user.id)
                .maybeSingle();

            if (profileData) setProfile(profileData);

            // 4. Cargar lista de referidos enriquecida
            const { data: referralsData } = await supabase
                .from('referrals')
                .select(`
                    id,
                    referred_id,
                    status,
                    created_at,
                    user_profiles:referred_id (full_name, avatar_url)
                `)
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (referralsData) {
                setReferrals(referralsData.map(r => ({
                    ...r,
                    user: r.user_profiles || { full_name: 'Usuario', avatar_url: null }
                })));
            }

            // 5. Cargar recompensas
            const { data: rewardsData } = await supabase
                .from('user_rewards')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setRewards(rewardsData || []);

        } catch (error) {
            console.warn('Error loading referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`${isModal ? 'p-6' : 'bg-white rounded-2xl shadow-lg p-6'}`}>
                <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    const currentLevel = levelInfo?.current_level || { icon: '🥉', name_es: 'Explorador', level: 1 };
    const nextLevel = levelInfo?.next_level;
    const progress = levelInfo?.progress || 0;

    const containerClass = isModal
        ? 'p-6'
        : 'bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden';

    return (
        <div className={containerClass}>
            {/* Header con degradado */}
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 text-white p-6 -mx-6 -mt-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                            <Gift className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Programa de Referidos</h2>
                            <p className="text-white/80 text-sm">Invita amigos y gana recompensas</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">{profile?.referral_count || 0}</div>
                    <div className="text-xs text-purple-600/80">Referidos</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{currentLevel.icon}</div>
                    <div className="text-xs text-blue-600/80">{currentLevel.name_es}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{(profile?.referral_points || 0).toFixed(1)}</div>
                    <div className="text-xs text-green-600/80">Puntos</div>
                </div>
            </div>

            {/* Nivel y Progreso */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{currentLevel.icon}</span>
                        <span className="font-bold text-gray-800">Nivel {currentLevel.number || 1}: {currentLevel.name_es}</span>
                    </div>
                    {nextLevel && (
                        <span className="text-sm text-gray-500">
                            → {nextLevel.icon} {nextLevel.name_es}
                        </span>
                    )}
                </div>

                {/* Progress bar */}
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
                    <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {nextLevel ? (
                    <p className="text-sm text-gray-600">
                        Te faltan <strong className="text-purple-600">{levelInfo.referrals_needed}</strong> referidos para nivel <strong>{nextLevel.name_es}</strong>
                    </p>
                ) : (
                    <p className="text-sm text-green-600 font-semibold flex items-center gap-1">
                        <Crown className="w-4 h-4" /> ¡Has alcanzado el nivel máximo!
                    </p>
                )}
            </div>

            {/* Recompensas Pendientes */}
            {levelInfo?.pending_rewards?.length > 0 && (
                <div className="mb-6 animate-pulse">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <h4 className="font-bold text-yellow-800 text-sm flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4" /> ¡Tienes recompensas listas!
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {levelInfo.pending_rewards.map(reward => (
                                <div key={reward.id} className="bg-white px-3 py-1 rounded-full text-xs font-medium border border-yellow-300">
                                    {reward.type === 'free_ad' ? `Anuncio gratis (${reward.value.days}d)` : reward.type}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tu código de referido */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Tu Código de Referido
                </h3>

                <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-white border-2 border-dashed border-yellow-300 rounded-lg px-4 py-3 text-center">
                        <span className="font-mono font-bold text-xl text-gray-800 tracking-wider">
                            {profile?.referral_code || 'N/A'}
                        </span>
                    </div>
                    <button
                        onClick={handleCopyCode}
                        className="bg-yellow-500 text-white p-3 rounded-lg hover:bg-yellow-600 transition"
                    >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleShareWhatsApp}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-600 transition"
                    >
                        <MessageCircle className="w-5 h-5" />
                        WhatsApp
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition"
                    >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Lista de Referidos */}
            <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Tus Referidos ({referrals.length})
                </h3>

                {referrals.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {referrals.map((ref) => (
                            <div key={ref.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {ref.user?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                                            {ref.user?.full_name || 'Usuario'}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                            {new Date(ref.created_at).toLocaleDateString('es-MX')}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${ref.status === 'business_added' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {ref.status === 'business_added' ? 'Activo' : 'Registrado'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-gray-500">
                        Comparte tu código para empezar
                    </div>
                )}
            </div>

            {/* Cómo funciona */}
            <div className="mt-6 bg-blue-50 rounded-xl p-4 text-xs">
                <h4 className="font-bold text-blue-800 mb-2 whitespace-nowrap">📖 ¿Cómo funciona?</h4>
                <ul className="text-blue-700 space-y-1">
                    <li>• Comparte tu código con amigos con negocio</li>
                    <li>• Registro: <strong>+0.5 pts</strong> | Negocio: <strong>+0.5 pts</strong></li>
                    <li>• ¡Gana días Premium y Anuncios Gratis!</li>
                </ul>
            </div>
        </div>
    );
}
