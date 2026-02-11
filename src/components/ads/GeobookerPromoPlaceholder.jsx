import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, TrendingUp, Users, Sparkles, MapPin, Zap, ArrowRight } from 'lucide-react';

/**
 * @param {Object} props
 * @param {'banner'|'card'|'inline'|'small'} props.variant - Style variant
 * @param {boolean} props.rotate - Whether to rotate through messages
 */
export default function GeobookerPromoPlaceholder({ variant = 'banner', rotate = true }) {
    const { t } = useTranslation();
    const [messageIndex, setMessageIndex] = useState(1); // Start from 1-4

    // Dynamic message construction using translations
    const getMessage = (idx) => ({
        title: t(`ads_placeholder.msg${idx}_title`),
        subtitle: t(`ads_placeholder.msg${idx}_subtitle`),
        cta: t(`ads_placeholder.msg${idx}_cta`),
        gradient: idx === 1 ? 'from-blue-600 to-purple-600' :
            idx === 2 ? 'from-green-500 to-teal-600' :
                idx === 3 ? 'from-orange-500 to-red-600' :
                    'from-yellow-500 to-orange-500',
        icon: idx === 1 ? Megaphone :
            idx === 2 ? MapPin :
                idx === 3 ? TrendingUp :
                    Sparkles
    });

    useEffect(() => {
        if (!rotate) return;
        const interval = setInterval(() => {
            setMessageIndex(prev => (prev % 4) + 1); // Cycle through 1, 2, 3, 4
        }, 8000);
        return () => clearInterval(interval);
    }, [rotate]);

    const message = getMessage(messageIndex);
    const Icon = message.icon;

    // Banner variant - Full width hero style
    if (variant === 'banner') {
        return (
            <div className="w-full py-4">
                <div className="max-w-6xl mx-auto px-4">
                    <Link
                        to="/advertise"
                        className={`relative block bg-gradient-to-r ${message.gradient} rounded-2xl p-6 md:p-8 text-white shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group`}
                    >
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute transform rotate-12 -right-8 -top-8 w-32 h-32 bg-white rounded-full" />
                            <div className="absolute transform -rotate-12 -left-4 -bottom-4 w-24 h-24 bg-white rounded-full" />
                        </div>

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex w-16 h-16 bg-white/20 backdrop-blur rounded-xl items-center justify-center">
                                    <img
                                        src="/images/geobooker-favicon.png"
                                        alt="Geobooker"
                                        className="w-10 h-10 object-contain"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black mb-1">
                                        {message.title}
                                    </h3>
                                    <p className="text-white/90 text-sm md:text-base">
                                        {message.subtitle}
                                    </p>
                                </div>
                            </div>
                            <button className="hidden md:flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg group-hover:scale-105 transition-transform">
                                {message.cta}
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>

                        <button className="md:hidden w-full mt-4 flex items-center justify-center gap-2 bg-white/20 backdrop-blur text-white px-4 py-3 rounded-xl font-bold border border-white/30">
                            {message.cta}
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        <span className="absolute top-2 right-2 bg-white/20 backdrop-blur text-white text-xs px-3 py-1 rounded-full">
                            {t('ads_placeholder.badge')}
                        </span>
                    </Link>
                </div>
            </div>
        );
    }

    // Card variant - For carousel style
    if (variant === 'card') {
        return (
            <Link
                to="/advertise"
                className="flex-shrink-0 w-72 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-dashed border-blue-300 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 group"
            >
                <div className="h-40 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                    <div className="text-center p-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Megaphone className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-blue-900 font-bold">{t('ads_placeholder.msg1_cta')}</p>
                    </div>
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {t('ads_placeholder.badge')}
                    </span>
                </div>
                <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                        🎯 {t('ads_placeholder.msg1_title')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        {t('ads_placeholder.msg1_subtitle')}
                    </p>
                    <button className="flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm group-hover:underline">
                        {t('ads_placeholder.msg1_cta')} <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </Link>
        );
    }

    // Inline variant - For sponsored results
    if (variant === 'inline') {
        return (
            <Link
                to="/advertise"
                className="block bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-lg p-4 mb-3 hover:shadow-md hover:border-blue-400 transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                📢 {t('ads_placeholder.badge')}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900">{message.title}</h3>
                        <p className="text-sm text-gray-600">{message.subtitle}</p>
                    </div>
                    <button className="hidden md:flex items-center gap-1 text-blue-600 font-semibold text-sm whitespace-nowrap">
                        {message.cta} <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </Link>
        );
    }

    // Small variant - For tight spaces
    if (variant === 'small') {
        return (
            <Link
                to="/advertise"
                className="block bg-gradient-to-r from-gray-50 to-blue-50 border border-dashed border-blue-300 rounded-lg p-3 text-center hover:shadow-md transition-all"
            >
                <div className="flex items-center justify-center gap-2">
                    <img
                        src="/images/geobooker-favicon.png"
                        alt="Geobooker"
                        className="w-6 h-6 object-contain"
                    />
                    <span className="text-sm text-blue-600 font-semibold">
                        {t('ads_placeholder.msg4_subtitle')} →
                    </span>
                </div>
            </Link>
        );
    }

    return null;
}
