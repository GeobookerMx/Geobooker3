// src/components/referral/ChristmasPromoModal.jsx
/**
 * Festive Christmas/New Year promotional modal for referral program
 * Shows on homepage for logged-in users to encourage referrals
 */
import React, { useState, useEffect } from 'react';
import { X, Gift, Sparkles, Star, Users, Crown, ChevronRight, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ChristmasPromoModal() {
    const { user } = useAuth();
    const [show, setShow] = useState(false);
    const [referralCode, setReferralCode] = useState(null);

    useEffect(() => {
        // Check if already dismissed today
        const dismissed = localStorage.getItem('xmas_promo_dismissed');
        const today = new Date().toDateString();

        if (dismissed === today) return;

        // Show after 2 seconds
        const timer = setTimeout(() => {
            if (user) {
                loadReferralCode();
                setShow(true);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [user]);

    const loadReferralCode = async () => {
        try {
            const { data } = await supabase
                .from('user_profiles')
                .select('referral_code')
                .eq('id', user.id)
                .single();
            setReferralCode(data?.referral_code);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('xmas_promo_dismissed', new Date().toDateString());
        setShow(false);
    };

    const handleWhatsApp = () => {
        const link = `https://geobooker.com.mx/r/${referralCode}`;
        const message = encodeURIComponent(
            `🎄 *REGALO DE NAVIDAD* 🎁\n\n` +
            `¡Hola! Te comparto una oportunidad increíble:\n\n` +
            `Registra tu negocio GRATIS en *Geobooker* y:\n\n` +
            `✅ Apareces en el mapa\n` +
            `✅ Más clientes te encuentran\n` +
            `✅ Prende/apaga tu negocio cuando quieras\n` +
            `✅ 100% GRATIS\n\n` +
            `🎯 *Promo Navideña:* Gana días Premium por cada referido\n\n` +
            `📲 Regístrate aquí:\n${link}\n\n` +
            `¡Aprovecha antes de que termine el año! 🚀\n` +
            `_geobooker.com.mx_`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
        handleDismiss();
    };

    if (!show || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            {/* Snow effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute text-white text-xl animate-fall"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 5}s`
                        }}
                    >
                        ❄
                    </div>
                ))}
            </div>

            {/* Modal */}
            <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-green-700 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
                {/* Decorations */}
                <div className="absolute top-0 left-0 text-6xl opacity-20">🎄</div>
                <div className="absolute top-0 right-0 text-6xl opacity-20">🎅</div>
                <div className="absolute bottom-0 left-0 text-6xl opacity-20">🎁</div>
                <div className="absolute bottom-0 right-0 text-6xl opacity-20">⭐</div>

                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-white/80 hover:text-white transition z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Content */}
                <div className="relative p-8 text-center">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4">
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                            <span className="text-white font-medium text-sm">PROMO NAVIDEÑA 2024</span>
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                            🎁 ¡Regalo de Navidad!
                        </h2>
                        <p className="text-white/90 text-lg">
                            Invita amigos y gana <span className="font-bold text-yellow-300">Premium GRATIS</span>
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
                        <h3 className="text-white font-bold mb-4 flex items-center justify-center gap-2">
                            <Gift className="w-5 h-5 text-yellow-300" />
                            Así funciona:
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-2xl mb-1">🥈</div>
                                <div className="text-white font-bold">3 referidos</div>
                                <div className="text-white/70 text-sm">7 días de anuncio gratis</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-2xl mb-1">🥇</div>
                                <div className="text-white font-bold">10 referidos</div>
                                <div className="text-white/70 text-sm">14 días de anuncio</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-2xl mb-1">💎</div>
                                <div className="text-white font-bold">25 referidos</div>
                                <div className="text-white/70 text-sm">30 días Premium</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-2xl mb-1">👑</div>
                                <div className="text-white font-bold">50 referidos</div>
                                <div className="text-white/70 text-sm">90 días + Enterprise</div>
                            </div>
                        </div>
                    </div>

                    {/* Persuasive Section */}
                    <div className="bg-yellow-400/20 backdrop-blur border-2 border-yellow-400/50 rounded-2xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">💡</div>
                            <div className="text-left">
                                <h4 className="text-white font-bold mb-1">
                                    ¿Conoces a alguien que quiera más clientes?
                                </h4>
                                <p className="text-white/90 text-sm">
                                    Tu familiar, amigo o vecino con negocio puede <strong>aparecer en Geobooker GRATIS</strong>.
                                    Ayúdales a iniciar el año con más ventas y <strong>tú ganas recompensas</strong>. ¡Todos ganan! 🎉
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleWhatsApp}
                            className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <MessageCircle className="w-6 h-6" />
                            Compartir en WhatsApp
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleDismiss}
                            className="w-full text-white/70 hover:text-white py-2 text-sm transition"
                        >
                            Ahora no, gracias
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-white/20">
                        <p className="text-white/60 text-xs">
                            🎄 Promoción válida hasta el 31 de diciembre 2024
                        </p>
                        {referralCode && (
                            <p className="text-white/80 text-sm mt-2">
                                Tu código: <span className="font-mono font-bold text-yellow-300">{referralCode}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes fall {
                    0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(360deg); opacity: 0.3; }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
                .animate-fall { animation: fall linear infinite; }
            `}</style>
        </div>
    );
}
