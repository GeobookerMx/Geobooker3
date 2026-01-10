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

// Definición de niveles
const LEVELS = [
    { level: 1, name: 'Nuevo', icon: '🌱', minReferrals: 0, color: 'bg-gray-500', rewards: null },
    { level: 2, name: 'Promotor', icon: '⭐', minReferrals: 3, color: 'bg-blue-500', rewards: '7 días Premium' },
    { level: 3, name: 'Embajador', icon: '🌟', minReferrals: 10, color: 'bg-purple-500', rewards: '30 días Premium' },
    { level: 4, name: 'Estrella', icon: '💫', minReferrals: 25, color: 'bg-yellow-500', rewards: '60 días Premium + Anuncio gratis' },
    { level: 5, name: 'Leyenda', icon: '👑', minReferrals: 50, color: 'bg-gradient-to-r from-yellow-400 to-orange-500', rewards: 'Premium ilimitado + Ads gratis' }
];

export default function ReferralDashboard({ isModal = false, onClose = null }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [profile, setProfile] = useState(null);
    const [referrals, setReferrals] = useState([]);
    const [rewards, setRewards] = useState([]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Cargar perfil
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('referral_code, referral_count, referral_points, current_level, premium_until, is_premium')
                .eq('id', user.id)
                .single();

            setProfile(profileData);

            // Cargar lista de referidos
            const { data: referralsData } = await supabase
                .from('referrals')
                .select(`
                    id,
                    referred_id,
                    status,
                    created_at,
                    converted_at,
                    reward_given
                `)
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            // Obtener nombres de los referidos
            if (referralsData && referralsData.length > 0) {
                const referredIds = referralsData.map(r => r.referred_id);
                const { data: usersData } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', referredIds);

                const usersMap = {};
                (usersData || []).forEach(u => { usersMap[u.id] = u; });

                const enrichedReferrals = referralsData.map(r => ({
                    ...r,
                    user: usersMap[r.referred_id] || { full_name: 'Usuario', avatar_url: null }
                }));

                setReferrals(enrichedReferrals);
            }

            // Cargar recompensas
            const { data: rewardsData } = await supabase
                .from('user_rewards')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            setRewards(rewardsData || []);

        } catch (error) {
            console.error('Error loading referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (profile?.referral_code) {
            navigator.clipboard.writeText(profile.referral_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopyLink = () => {
        if (profile?.referral_code) {
            const link = `https://geobooker.com.mx/r/${profile.referral_code}`;
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShareWhatsApp = () => {
        if (!profile?.referral_code) return;

        const link = `https://geobooker.com.mx/r/${profile.referral_code}`;
        const message = encodeURIComponent(
            `━━━━━━━━━━━━━━━━━\n` +
            `🗺️ *GEOBOOKER* 📍\n` +
            `━━━━━━━━━━━━━━━━━\n\n` +
            `¡Hola! 👋\n\n` +
            `¿Tienes un negocio? *Regístralo GRATIS* 🚀\n\n` +
            `✅ Apareces en el mapa\n` +
            `✅ Los clientes te encuentran\n` +
            `✅ 100% gratis\n\n` +
            `📲 *Regístrate:*\n${link}\n\n` +
            `_geobooker.com.mx_`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const getCurrentLevel = () => {
        const count = profile?.referral_count || 0;
        for (let i = LEVELS.length - 1; i >= 0; i--) {
            if (count >= LEVELS[i].minReferrals) {
                return LEVELS[i];
            }
        }
        return LEVELS[0];
    };

    const getNextLevel = () => {
        const currentLevel = getCurrentLevel();
        const nextIndex = LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
        return nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;
    };

    const getProgressToNextLevel = () => {
        const current = getCurrentLevel();
        const next = getNextLevel();
        if (!next) return 100;

        const count = profile?.referral_count || 0;
        const progress = ((count - current.minReferrals) / (next.minReferrals - current.minReferrals)) * 100;
        return Math.min(100, Math.max(0, progress));
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

    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    const progress = getProgressToNextLevel();

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
                    {isModal && onClose && (
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            ✕
                        </button>
                    )}
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
                    <div className="text-xs text-blue-600/80">{currentLevel.name}</div>
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
                        <span className="font-bold text-gray-800">Nivel {currentLevel.level}: {currentLevel.name}</span>
                    </div>
                    {nextLevel && (
                        <span className="text-sm text-gray-500">
                            → {nextLevel.icon} {nextLevel.name}
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
                        Te faltan <strong className="text-purple-600">{nextLevel.minReferrals - (profile?.referral_count || 0)}</strong> referidos para nivel <strong>{nextLevel.name}</strong>
                        {nextLevel.rewards && <span className="text-green-600"> (+{nextLevel.rewards})</span>}
                    </p>
                ) : (
                    <p className="text-sm text-green-600 font-semibold flex items-center gap-1">
                        <Crown className="w-4 h-4" /> ¡Has alcanzado el nivel máximo!
                    </p>
                )}
            </div>

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
                        title="Copiar código"
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
                        Compartir por WhatsApp
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition"
                        title="Copiar link"
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
                            <div
                                key={ref.id}
                                className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                                        {ref.user?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{ref.user?.full_name || 'Usuario'}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(ref.created_at).toLocaleDateString('es-MX')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {ref.status === 'business_added' ? (
                                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                            <Check className="w-3 h-3" /> Negocio agregado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">
                                            <Clock className="w-3 h-3" /> Registrado
                                        </span>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                        +{ref.status === 'business_added' ? '1' : '0.5'} pts
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-6 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Aún no tienes referidos</p>
                        <p className="text-sm text-gray-400">Comparte tu código para empezar a ganar</p>
                    </div>
                )}
            </div>

            {/* Tabla de Niveles */}
            <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Niveles y Recompensas
                </h3>

                <div className="space-y-2">
                    {LEVELS.map((level) => {
                        const isCurrentLevel = currentLevel.level === level.level;
                        const isAchieved = (profile?.referral_count || 0) >= level.minReferrals;

                        return (
                            <div
                                key={level.level}
                                className={`flex items-center justify-between p-3 rounded-lg transition ${isCurrentLevel
                                        ? 'bg-purple-100 border-2 border-purple-400'
                                        : isAchieved
                                            ? 'bg-green-50 border border-green-200'
                                            : 'bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{level.icon}</span>
                                    <div>
                                        <p className={`font-semibold ${isCurrentLevel ? 'text-purple-700' : 'text-gray-800'}`}>
                                            Nivel {level.level}: {level.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {level.minReferrals} referidos
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {level.rewards ? (
                                        <span className={`text-xs font-medium ${isAchieved ? 'text-green-600' : 'text-gray-500'}`}>
                                            {level.rewards}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">Sin recompensa</span>
                                    )}
                                    {isAchieved && (
                                        <Check className="w-4 h-4 text-green-500 inline ml-2" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cómo funciona */}
            <div className="mt-6 bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-2">📖 ¿Cómo funciona?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Comparte tu código con amigos que tengan negocio</li>
                    <li>• Cuando se registran con tu código: <strong>+0.5 puntos</strong></li>
                    <li>• Cuando agregan su negocio: <strong>+0.5 puntos adicionales</strong></li>
                    <li>• Al subir de nivel, recibes recompensas automáticamente</li>
                </ul>
            </div>
        </div>
    );
}
