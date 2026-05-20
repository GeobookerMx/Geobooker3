// src/components/referral/ChristmasPromoModal.jsx
/**
 * Festive Christmas/New Year promotional modal for referral program
 * Shows on homepage for ALL visitors to encourage referrals
 * Bilingual: Spanish & English
 */
import React, { useState, useEffect } from 'react';
import { X, Gift, Sparkles, Star, Users, Crown, ChevronRight, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Bilingual text content
const CONTENT = {
    es: {
        promoTag: 'PROMO NAVIDEÑA 2024',
        title: '🎁 ¡Regalo de Navidad!',
        subtitle: 'Invita amigos y gana',
        subtitleHighlight: 'Premium GRATIS',
        howItWorks: 'Así funciona:',
        level1: '3 referidos',
        level1Reward: '7 días de anuncio gratis',
        level2: '10 referidos',
        level2Reward: '14 días de anuncio',
        level3: '25 referidos',
        level3Reward: '30 días Premium',
        level4: '50 referidos',
        level4Reward: '90 días + Enterprise',
        persuasiveTitle: '¿Conoces a alguien que quiera más clientes?',
        persuasiveText: 'Tu familiar, amigo o vecino con negocio puede aparecer en Geobooker GRATIS. Ayúdales a iniciar el año con más ventas y tú ganas recompensas. ¡Todos ganan! 🎉',
        shareWhatsApp: 'Compartir en WhatsApp',
        registerFree: '¡Registra tu negocio GRATIS!',
        notNow: 'Ahora no, gracias',
        validUntil: '🎄 Promoción válida hasta el 9 de enero 2025',
        yourCode: 'Tu código:',
        whatsappMessage: (link) =>
            `🎄 *REGALO DE NAVIDAD* 🎁\n\n` +
            `¡Hola! Te comparto una oportunidad increíble:\n\n` +
            `Registra tu negocio GRATIS en *Geobooker* y:\n\n` +
            `✅ Apareces en el mapa\n` +
            `✅ Más clientes te encuentran\n` +
            `✅ Prende/apaga tu negocio cuando quieras\n` +
            `✅ 100% GRATIS\n\n` +
            `🎯 *Promo de Año Nuevo:* ¡Empieza el 2025 con más clientes!\n\n` +
            `📲 Regístrate aquí:\n${link}\n\n` +
            `¡Aprovecha esta promoción! 🚀\n` +
            `_geobooker.com.mx_`
    },
    en: {
        promoTag: 'HOLIDAY PROMO 2024',
        title: '🎁 Holiday Gift!',
        subtitle: 'Invite friends and earn',
        subtitleHighlight: 'FREE Premium',
        howItWorks: 'How it works:',
        level1: '3 referrals',
        level1Reward: '7 free ad days',
        level2: '10 referrals',
        level2Reward: '14 ad days',
        level3: '25 referrals',
        level3Reward: '30 Premium days',
        level4: '50 referrals',
        level4Reward: '90 days + Enterprise',
        persuasiveTitle: 'Know someone who wants more customers?',
        persuasiveText: 'Your friend, family member or neighbor with a business can be on Geobooker for FREE. Help them start the year with more sales and YOU earn rewards. Everyone wins! 🎉',
        shareWhatsApp: 'Share on WhatsApp',
        registerFree: 'Register your business FREE!',
        notNow: 'Not now, thanks',
        validUntil: '🎄 Promotion valid until January 9, 2025',
        yourCode: 'Your code:',
        whatsappMessage: (link) =>
            `🎄 *HOLIDAY GIFT* 🎁\n\n` +
            `Hey! I'm sharing an amazing opportunity:\n\n` +
            `Register your business FREE on *Geobooker* and:\n\n` +
            `✅ Appear on the map\n` +
            `✅ More customers find you\n` +
            `✅ Turn your business on/off anytime\n` +
            `✅ 100% FREE\n\n` +
            `🎯 *New Year Promo:* Start 2025 with more customers!\n\n` +
            `📲 Sign up here:\n${link}\n\n` +
            `Don't miss this promotion! 🚀\n` +
            `_geobooker.com.mx_`
    }
};

export default function ChristmasPromoModal() {
    const { i18n } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [referralCode, setReferralCode] = useState(null);

    // Get current language content (default to Spanish)
    const lang = i18n.language?.startsWith('en') ? 'en' : 'es';
    const t = CONTENT[lang];

    // Promo valid until January 9, 2025
    const PROMO_END_DATE = new Date('2025-01-10');

    useEffect(() => {
        // Check if promo has expired
        if (new Date() > PROMO_END_DATE) return;

        // Check if already dismissed today
        const dismissed = localStorage.getItem('xmas_promo_dismissed');
        const today = new Date().toDateString();

        if (dismissed === today) return;

        // Show after 2 seconds for ALL visitors
        const timer = setTimeout(() => {
            setShow(true);
            // Load referral code if user is logged in
            if (user) {
                loadReferralCode();
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
        const link = referralCode
            ? `https://geobooker.com.mx/r/${referralCode}`
            : 'https://geobooker.com.mx/signup';
        const message = encodeURIComponent(t.whatsappMessage(link));
        window.open(`https://wa.me/?text=${message}`, '_blank');
        handleDismiss();
    };

    const handleRegister = () => {
        handleDismiss();
        navigate('/signup');
    };

    if (!show) return null;


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
                            <span className="text-white font-medium text-sm">{t.promoTag}</span>
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                            {t.title}
                        </h2>
                        <p className="text-white/90 text-lg">
                            {t.subtitle} <span className="font-bold text-yellow-300">{t.subtitleHighlight}</span>
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
                        <h3 className="text-white font-bold mb-4 flex items-center justify-center gap-2">
                            <Gift className="w-5 h-5 text-yellow-300" />
                            {t.howItWorks}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-2xl mb-1">🥈</div>
                                <div className="text-white font-bold">{t.level1}</div>
                                <div className="text-white/70 text-sm">{t.level1Reward}</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-2xl mb-1">🥇</div>
                                <div className="text-white font-bold">{t.level2}</div>
                                <div className="text-white/70 text-sm">{t.level2Reward}</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-2xl mb-1">💎</div>
                                <div className="text-white font-bold">{t.level3}</div>
                                <div className="text-white/70 text-sm">{t.level3Reward}</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-2xl mb-1">👑</div>
                                <div className="text-white font-bold">{t.level4}</div>
                                <div className="text-white/70 text-sm">{t.level4Reward}</div>
                            </div>
                        </div>
                    </div>

                    {/* Persuasive Section */}
                    <div className="bg-yellow-400/20 backdrop-blur border-2 border-yellow-400/50 rounded-2xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">💡</div>
                            <div className="text-left">
                                <h4 className="text-white font-bold mb-1">
                                    {t.persuasiveTitle}
                                </h4>
                                <p className="text-white/90 text-sm">
                                    {t.persuasiveText}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                        {user ? (
                            // Logged in user - Show WhatsApp share
                            <button
                                onClick={handleWhatsApp}
                                className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <MessageCircle className="w-6 h-6" />
                                {t.shareWhatsApp}
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            // Not logged in - Show register button
                            <button
                                onClick={handleRegister}
                                className="w-full flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <Gift className="w-6 h-6" />
                                {t.registerFree}
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={handleDismiss}
                            className="w-full text-white/70 hover:text-white py-2 text-sm transition"
                        >
                            {t.notNow}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-white/20">
                        <p className="text-white/60 text-xs">
                            {t.validUntil}
                        </p>
                        {referralCode && (
                            <p className="text-white/80 text-sm mt-2">
                                {t.yourCode} <span className="font-mono font-bold text-yellow-300">{referralCode}</span>
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
