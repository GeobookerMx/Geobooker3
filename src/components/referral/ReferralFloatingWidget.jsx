// src/components/referral/ReferralFloatingWidget.jsx
/**
 * Fun floating referral widget that appears on the homepage
 * Gamified design to encourage sharing
 */
import React, { useState, useEffect } from 'react';
import { Gift, X, Sparkles, Users, MessageCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ReferralFloatingWidget() {
    const { user } = useAuth();
    const [show, setShow] = useState(false);
    const [referralCode, setReferralCode] = useState(null);
    const [referralCount, setReferralCount] = useState(0);
    const [dismissed, setDismissed] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        // Show after 3 seconds on page
        const timer = setTimeout(() => {
            if (!dismissed) setShow(true);
        }, 3000);

        if (user) {
            loadReferralData();
        }

        return () => clearTimeout(timer);
    }, [user, dismissed]);

    const loadReferralData = async () => {
        try {
            const { data } = await supabase
                .from('user_profiles')
                .select('referral_code, referral_count')
                .eq('id', user.id)
                .single();

            if (data) {
                setReferralCode(data.referral_code);
                setReferralCount(data.referral_count || 0);
            }
        } catch (error) {
            console.error('Error loading referral data:', error);
        }
    };

    const handleWhatsApp = () => {
        const link = `https://geobooker.com.mx/r/${referralCode}`;
        const message = encodeURIComponent(
            `━━━━━━━━━━━━━━━━━\n` +
            `🗺️ *GEOBOOKER* 📍\n` +
            `━━━━━━━━━━━━━━━━━\n\n` +
            `¡Hola! 👋\n\n` +
            `¿Tienes un negocio? *Regístralo GRATIS* 🚀\n\n` +
            `✅ Apareces en el mapa\n` +
            `✅ Prende/apaga tu negocio\n` +
            `✅ 100% gratis\n\n` +
            `📲 *Regístrate:*\n${link}\n\n` +
            `_geobooker.com.mx_`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
        setAnimating(true);
        setTimeout(() => setAnimating(false), 1000);
    };

    const handleDismiss = () => {
        setDismissed(true);
        setShow(false);
    };

    // Calculate progress to next reward (5 referrals = 30 days)
    const progress = (referralCount % 5) / 5 * 100;
    const nextRewardIn = 5 - (referralCount % 5);

    if (!user || !show || !referralCode) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* Floating Card */}
            <div className={`bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 rounded-2xl shadow-2xl p-5 w-80 relative overflow-hidden ${animating ? 'animate-pulse' : ''}`}>
                {/* Sparkle decorations */}
                <div className="absolute top-2 left-2 text-yellow-300 animate-bounce">
                    <Sparkles className="w-4 h-4" />
                </div>
                <div className="absolute top-4 right-12 text-yellow-200 animate-pulse">
                    <Sparkles className="w-3 h-3" />
                </div>

                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-white/60 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">¡Gana Premium! 🎁</h3>
                        <p className="text-white/80 text-xs">Invita negocios y gana días gratis</p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="bg-white/20 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Stats */}
                <div className="flex justify-between text-xs text-white/80 mb-4">
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {referralCount} referidos
                    </span>
                    <span>
                        {nextRewardIn === 5
                            ? '¡Comienza a invitar!'
                            : `${nextRewardIn} más para +30 días`
                        }
                    </span>
                </div>

                {/* CTA Button */}
                <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center justify-center gap-2 bg-white text-purple-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
                >
                    <MessageCircle className="w-5 h-5" />
                    Invitar por WhatsApp
                    <ChevronRight className="w-4 h-4" />
                </button>

                {/* Mini info */}
                <p className="text-center text-white/60 text-xs mt-2">
                    5 negocios registrados = 30 días Premium
                </p>
            </div>
        </div>
    );
}
