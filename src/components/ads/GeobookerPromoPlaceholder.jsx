// src/components/ads/GeobookerPromoPlaceholder.jsx
/**
 * Placeholder component for empty ad spaces
 * Shows Geobooker branding with motivational messages
 * Variants: banner, card, inline
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, TrendingUp, Users, Sparkles, MapPin, Zap, ArrowRight } from 'lucide-react';

// Mensajes motivacionales rotativos
const PROMO_MESSAGES = [
    {
        title: '🚀 Impulsa tu Negocio',
        subtitle: 'Más de 10,000 usuarios buscan negocios como el tuyo cada día',
        cta: '¡Anúnciate Aquí!',
        icon: Megaphone,
        gradient: 'from-blue-600 to-purple-600'
    },
    {
        title: '📍 ¿Ya abriste digitalmente?',
        subtitle: 'Prende tu negocio en el mapa y atrae nuevos clientes',
        cta: 'Registra tu Negocio',
        icon: MapPin,
        gradient: 'from-green-500 to-teal-600'
    },
    {
        title: '🔥 ¿Quieres más ventas?',
        subtitle: 'Este espacio puede ser tuyo. Crea tu campaña ahora',
        cta: 'Crear Campaña',
        icon: TrendingUp,
        gradient: 'from-orange-500 to-red-600'
    },
    {
        title: '💡 Espacio Disponible',
        subtitle: 'Anuncia tu negocio aquí y llega a miles de clientes',
        cta: 'Ver Opciones',
        icon: Sparkles,
        gradient: 'from-yellow-500 to-orange-500'
    },
    {
        title: '👥 Nuevos Clientes te Esperan',
        subtitle: 'Aparece primero cuando busquen negocios cerca de ti',
        cta: 'Destacar Negocio',
        icon: Users,
        gradient: 'from-pink-500 to-rose-600'
    },
    {
        title: '⚡ Llena este espacio',
        subtitle: 'Tu publicidad aquí puede generar ventas reales',
        cta: 'Anunciarme',
        icon: Zap,
        gradient: 'from-indigo-500 to-blue-600'
    }
];

/**
 * @param {Object} props
 * @param {'banner'|'card'|'inline'|'small'} props.variant - Style variant
 * @param {boolean} props.rotate - Whether to rotate through messages
 */
export default function GeobookerPromoPlaceholder({ variant = 'banner', rotate = true }) {
    const [messageIndex, setMessageIndex] = useState(Math.floor(Math.random() * PROMO_MESSAGES.length));

    useEffect(() => {
        if (!rotate) return;
        const interval = setInterval(() => {
            setMessageIndex(prev => (prev + 1) % PROMO_MESSAGES.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [rotate]);

    const message = PROMO_MESSAGES[messageIndex];
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
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute transform rotate-12 -right-8 -top-8 w-32 h-32 bg-white rounded-full" />
                            <div className="absolute transform -rotate-12 -left-4 -bottom-4 w-24 h-24 bg-white rounded-full" />
                        </div>

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Logo */}
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

                        {/* Mobile CTA */}
                        <button className="md:hidden w-full mt-4 flex items-center justify-center gap-2 bg-white/20 backdrop-blur text-white px-4 py-3 rounded-xl font-bold border border-white/30">
                            {message.cta}
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        {/* Badge */}
                        <span className="absolute top-2 right-2 bg-white/20 backdrop-blur text-white text-xs px-3 py-1 rounded-full">
                            Espacio Disponible
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
                        <p className="text-blue-900 font-bold">Tu Negocio Aquí</p>
                    </div>
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        DISPONIBLE
                    </span>
                </div>
                <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                        🎯 Espacio Publicitario
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Destaca tu negocio aquí y atrae nuevos clientes
                    </p>
                    <button className="flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm group-hover:underline">
                        Anunciarme <ArrowRight className="w-4 h-4 ml-1" />
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
                                📢 ESPACIO DISPONIBLE
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
                        ¿Quieres más clientes? Anúnciate aquí →
                    </span>
                </div>
            </Link>
        );
    }

    return null;
}
