// Tienda de Premios Canjeables por Puntos de Referidos
// src/components/referral/RewardShop.jsx

import React, { useState, useEffect } from 'react';
import {
    Gift, ShoppingBag, Target, MapPin, Award, Clock,
    Sparkles, TrendingUp, Eye, CreditCard, CheckCircle, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const RewardShop = ({ userId }) => {
    const [inventory, setInventory] = useState(null);
    const [userBusinesses, setUserBusinesses] = useState([]);
    const [selectedReward, setSelectedReward] = useState(null);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);

    // Configuración del checkout
    const [checkoutConfig, setCheckoutConfig] = useState({
        businessId: null,
        duration: 7,
        targetCity: '',
        targetCategory: ''
    });

    useEffect(() => {
        loadInventory();
        loadUserBusinesses();
    }, [userId]);

    const loadInventory = async () => {
        try {
            const { data, error } = await supabase
                .from('user_rewards_inventory')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setInventory(data || { points_available: 0 });
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    };

    const loadUserBusinesses = async () => {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('id, name, category, city')
                .eq('owner_id', userId)
                .eq('is_active', true);

            if (error) throw error;
            setUserBusinesses(data || []);
        } catch (error) {
            console.error('Error loading businesses:', error);
        }
    };

    // Catálogo de premios
    const rewards = [
        {
            id: 'ad_7d',
            type: 'ad_campaign',
            name: 'Anuncio Básico',
            description: '7 días de visibilidad en búsquedas',
            duration: 7,
            points: 3,
            features: ['Aparece en resultados de búsqueda', 'Sin segmentación', 'Métricas básicas'],
            icon: Award,
            color: 'blue'
        },
        {
            id: 'ad_14d_city',
            type: 'geo_targeting',
            name: 'Anuncio Segmentado',
            description: '14 días con targeting por ciudad',
            duration: 14,
            points: 5,
            features: ['Segmentación por ciudad', 'Mayor relevancia', 'Métricas avanzadas'],
            icon: MapPin,
            color: 'green'
        },
        {
            id: 'ad_30d_premium',
            type: 'sponsored_result',
            name: 'Resultado Patrocinado',
            description: '30 días en posición destacada',
            duration: 30,
            points: 10,
            features: ['Primera posición en categoría', 'Badge "Patrocinado"', 'Analytics completo'],
            icon: Target,
            color: 'purple'
        },
        {
            id: 'ad_60d_header',
            type: 'premium_slot',
            name: 'Slot Premium',
            description: '60 días en header + sticky',
            duration: 60,
            points: 20,
            features: ['Banner header principal', 'Sticky footer', 'Máxima visibilidad', 'A/B testing'],
            icon: Sparkles,
            color: 'yellow'
        },
        {
            id: 'ad_180d_vip',
            type: 'carousel',
            name: 'Campaña VIP',
            description: '180 días en carrusel destacado',
            duration: 180,
            points: 50,
            features: ['Rotación en home page', 'Email marketing incluido', 'Campaña omnicanal', 'Soporte prioritario'],
            icon: TrendingUp,
            color: 'red'
        }
    ];

    const handleSelectReward = (reward) => {
        if (inventory.points_available < reward.points) {
            toast.error(`Necesitas ${reward.points} puntos. Tienes ${inventory.points_available}`);
            return;
        }

        if (userBusinesses.length === 0) {
            toast.error('Primero debes tener un negocio registrado');
            return;
        }

        setSelectedReward(reward);
        setShowCheckout(true);
        setCheckoutConfig({
            businessId: userBusinesses[0].id,
            duration: reward.duration,
            targetCity: userBusinesses[0].city || '',
            targetCategory: userBusinesses[0].category || ''
        });
    };

    const handleRedeem = async () => {
        if (!checkoutConfig.businessId) {
            toast.error('Selecciona un negocio');
            return;
        }

        setIsRedeeming(true);

        try {
            const { data, error } = await supabase.rpc('redeem_points_for_ad', {
                p_user_id: userId,
                p_reward_type: selectedReward.type,
                p_duration_days: checkoutConfig.duration,
                p_business_id: checkoutConfig.businessId,
                p_target_city: checkoutConfig.targetCity || null,
                p_target_category: checkoutConfig.targetCategory || null
            });

            if (error) throw error;

            if (!data.success) {
                toast.error(data.error || 'Error al canjear premio');
                return;
            }

            toast.success(`¡Premio canjeado! ${data.points_spent} puntos gastados. Te quedan ${data.remaining_points}`);
            setShowCheckout(false);
            setSelectedReward(null);
            loadInventory(); // Recargar puntos
        } catch (error) {
            console.error('Redeem error:', error);
            toast.error('Error al canjear: ' + error.message);
        } finally {
            setIsRedeeming(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header con puntos */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-purple-100 text-sm mb-1">Puntos Disponibles</p>
                        <p className="text-5xl font-bold">{inventory?.points_available || 0}</p>
                        <p className="text-purple-200 text-sm mt-2">
                            Ganados: {inventory?.total_points_earned || 0} •
                            Gastados: {inventory?.points_spent || 0}
                        </p>
                    </div>
                    <ShoppingBag className="w-16 h-16 text-purple-200" />
                </div>
            </div>

            {/* Catálogo de premios */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Catálogo de Premios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewards.map((reward) => {
                        const Icon = reward.icon;
                        const colorClasses = {
                            blue: 'bg-blue-500',
                            green: 'bg-green-500',
                            purple: 'bg-purple-500',
                            yellow: 'bg-yellow-500',
                            red: 'bg-red-500'
                        };

                        const canAfford = inventory?.points_available >= reward.points;

                        return (
                            <div
                                key={reward.id}
                                className={`bg-white rounded-xl shadow-md border-2 transition-all ${canAfford
                                        ? 'border-gray-200 hover:border-purple-400 hover:shadow-lg cursor-pointer'
                                        : 'border-gray-100 opacity-60'
                                    }`}
                                onClick={() => canAfford && handleSelectReward(reward)}
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 ${colorClasses[reward.color]} rounded-lg`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Gift className="w-4 h-4 text-gray-500" />
                                            <span className="text-2xl font-bold text-gray-900">{reward.points}</span>
                                            <span className="text-sm text-gray-500">pts</span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{reward.name}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{reward.description}</p>

                                    <div className="space-y-2">
                                        {reward.features.map((feature, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        <span>{reward.duration} días de campaña</span>
                                    </div>

                                    {!canAfford && (
                                        <div className="mt-4 p-2 bg-yellow-50 rounded text-xs text-yellow-800 text-center">
                                            Necesitas {reward.points - (inventory?.points_available || 0)} puntos más
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal de checkout */}
            {showCheckout && selectedReward && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Configurar Campaña</h3>
                            <button
                                onClick={() => setShowCheckout(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Negocio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Negocio
                                </label>
                                <select
                                    value={checkoutConfig.businessId || ''}
                                    onChange={(e) => setCheckoutConfig({ ...checkoutConfig, businessId: e.target.value })}
                                    className="w-full p-3 border rounded-lg"
                                >
                                    {userBusinesses.map((biz) => (
                                        <option key={biz.id} value={biz.id}>
                                            {biz.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Ciudad (opcional) */}
                            {selectedReward.type === 'geo_targeting' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ciudad objetivo (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={checkoutConfig.targetCity}
                                        onChange={(e) => setCheckoutConfig({ ...checkoutConfig, targetCity: e.target.value })}
                                        placeholder="Ciudad de México"
                                        className="w-full p-3 border rounded-lg"
                                    />
                                </div>
                            )}

                            {/* Categoría (opcional) */}
                            {selectedReward.type === 'geo_targeting' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Categoría objetivo (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={checkoutConfig.targetCategory}
                                        onChange={(e) => setCheckoutConfig({ ...checkoutConfig, targetCategory: e.target.value })}
                                        placeholder="Restaurantes"
                                        className="w-full p-3 border rounded-lg"
                                    />
                                </div>
                            )}

                            {/* Resumen */}
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <p className="text-sm font-medium text-purple-900 mb-2">Resumen</p>
                                <div className="space-y-1 text-sm text-purple-800">
                                    <p>• Duración: {selectedReward.duration} días</p>
                                    <p>• Costo: {selectedReward.points} puntos</p>
                                    <p>• Te quedarán: {inventory.points_available - selectedReward.points} puntos</p>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCheckout(false)}
                                    className="flex-1 px-4 py-3 border rounded-lg font-medium hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRedeem}
                                    disabled={isRedeeming}
                                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400"
                                >
                                    {isRedeeming ? 'Procesando...' : `Canjear ${selectedReward.points} pts`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 ¿Cómo ganar más puntos?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Comparte tu código de referido por WhatsApp</li>
                    <li>• Gana +0.5 pts cuando alguien se registra con tu código</li>
                    <li>• Gana +0.5 pts adicionales cuando agregan un negocio</li>
                    <li>• Total: 1 punto por cada referido completo</li>
                </ul>
            </div>
        </div>
    );
};

export default RewardShop;
