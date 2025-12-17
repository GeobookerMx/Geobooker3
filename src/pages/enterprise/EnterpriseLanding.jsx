// src/pages/enterprise/EnterpriseLanding.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Globe, TrendingUp, Users, MapPin, Star, ArrowRight,
    CheckCircle, Clock, Zap, Shield, BarChart3, Target,
    Building2, Calendar, Languages, Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';

export default function EnterpriseLanding() {
    const [pricing, setPricing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [promoEndDate, setPromoEndDate] = useState(null);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

    useEffect(() => {
        fetchPricing();
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!promoEndDate) return;

        const timer = setInterval(() => {
            const now = new Date();
            const end = new Date(promoEndDate);
            const diff = end - now;

            if (diff > 0) {
                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((diff / (1000 * 60)) % 60)
                });
            }
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [promoEndDate]);

    const fetchPricing = async () => {
        try {
            const { data, error } = await supabase.rpc('get_enterprise_pricing');
            if (error) throw error;

            if (data && data.length > 0) {
                setPricing(data);
                setPromoEndDate(data[0].promo_ends_at);

                // Calculate initial time left
                const now = new Date();
                const end = new Date(data[0].promo_ends_at);
                const diff = end - now;
                if (diff > 0) {
                    setTimeLeft({
                        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                        minutes: Math.floor((diff / (1000 * 60)) % 60)
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching pricing:', error);
            // Fallback pricing if RPC not available yet
            setPricing([
                { code: 'city_pack', name: 'City Pack', regular_price_usd: 2500, current_price_usd: 1250, discount_percent: 50, cities_included: 1, duration_months: 1, is_promo_active: true },
                { code: 'regional', name: 'Regional Pack', regular_price_usd: 15000, current_price_usd: 7500, discount_percent: 50, cities_included: 5, duration_months: 3, is_promo_active: true },
                { code: 'national', name: 'National Coverage', regular_price_usd: 35000, current_price_usd: 17500, discount_percent: 50, cities_included: 999, duration_months: 3, is_promo_active: true },
                { code: 'global_event', name: 'Global Event', regular_price_usd: 50000, current_price_usd: 25000, discount_percent: 50, cities_included: 999, duration_months: 3, is_promo_active: true }
            ]);
            setTimeLeft({ days: 90, hours: 0, minutes: 0 });
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            <SEO
                title="Geobooker Enterprise - Publicidad Global para Marcas Internacionales"
                description="Alcanza millones de usuarios en eventos como FIFA 2026. Publicidad geolocalizada para marcas globales."
            />

            {/* Promo Banner Sticky */}
            <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <span className="font-bold">🚀 PROMOCIÓN DE LANZAMIENTO: 50% OFF</span>
                        <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="opacity-90">Oferta termina en:</span>
                        <div className="flex gap-2">
                            <div className="bg-white/20 backdrop-blur px-2 py-1 rounded">
                                <span className="font-bold">{timeLeft.days}</span> días
                            </div>
                            <div className="bg-white/20 backdrop-blur px-2 py-1 rounded">
                                <span className="font-bold">{timeLeft.hours}</span> hrs
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative py-20 px-4 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-orange-600/20 to-pink-600/20 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-600/30 backdrop-blur-sm text-blue-300 px-4 py-2 rounded-full mb-6">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm font-medium">Publicidad Global Geolocalizada</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                        Alcanza a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Millones</span>
                        <br />en Eventos Mundiales
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                        FIFA 2026 • Super Bowl • Olimpiadas • Festivales Globales
                        <br />
                        <span className="text-lg text-gray-400">Tu marca, donde están tus clientes.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <Link
                            to="/enterprise/contact"
                            className="group bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all flex items-center gap-2"
                        >
                            Solicitar Cotización
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#pricing"
                            className="text-gray-300 hover:text-white px-6 py-4 rounded-xl font-medium border border-gray-700 hover:border-gray-500 transition-colors"
                        >
                            Ver Precios
                        </a>
                    </div>

                    {/* Logos de empresas potenciales */}
                    <div className="flex items-center justify-center gap-8 opacity-50">
                        <span className="text-gray-500 text-sm">Ideal para:</span>
                        <div className="flex items-center gap-6 text-gray-400 text-sm">
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> Bebidas</span>
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> Automotriz</span>
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> Tech</span>
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> Retail</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 px-4 border-y border-gray-700/50">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { value: '10M+', label: 'Impresiones/mes', icon: TrendingUp },
                        { value: '50+', label: 'Ciudades', icon: MapPin },
                        { value: '4.8★', label: 'Satisfacción', icon: Star },
                        { value: '150%', label: 'ROI Promedio', icon: BarChart3 }
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <stat.icon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                            <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-gray-400 text-sm">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
                        ¿Por qué Geobooker Enterprise?
                    </h2>
                    <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
                        Tecnología de segmentación geográfica de última generación
                    </p>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Target,
                                title: 'Segmentación Precisa',
                                desc: 'Llega a usuarios en ciudades específicas: Los Angeles, Miami, New York...',
                                color: 'text-blue-400 bg-blue-400/10'
                            },
                            {
                                icon: Languages,
                                title: 'Creativos Multilingües',
                                desc: 'Tu mensaje en inglés, español, francés o el idioma de tu audiencia.',
                                color: 'text-green-400 bg-green-400/10'
                            },
                            {
                                icon: Calendar,
                                title: 'Eventos Especiales',
                                desc: 'Sincroniza campañas con FIFA 2026, Super Bowl, festivales y más.',
                                color: 'text-purple-400 bg-purple-400/10'
                            },
                            {
                                icon: BarChart3,
                                title: 'Analytics en Tiempo Real',
                                desc: 'Dashboard con métricas por ciudad, dispositivo y horario.',
                                color: 'text-amber-400 bg-amber-400/10'
                            },
                            {
                                icon: Shield,
                                title: 'Brand Safety',
                                desc: 'Tu marca en contextos seguros y alineados con tus valores.',
                                color: 'text-red-400 bg-red-400/10'
                            },
                            {
                                icon: Users,
                                title: 'Account Manager',
                                desc: 'Un experto dedicado para optimizar tu campaña.',
                                color: 'text-cyan-400 bg-cyan-400/10'
                            }
                        ].map((feature, i) => (
                            <div key={i} className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6 hover:border-gray-600 transition-colors">
                                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                                <p className="text-gray-400">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-transparent via-slate-800/50 to-transparent">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 px-4 py-2 rounded-full mb-4">
                            <Zap className="w-4 h-4" />
                            <span className="font-bold">PROMOCIÓN DE LANZAMIENTO</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            50% de Descuento en Todos los Paquetes
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Por ser de nuestros primeros clientes enterprise, te ofrecemos precios exclusivos.
                            Oferta válida hasta agotar disponibilidad.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {pricing.map((plan, i) => (
                            <div
                                key={plan.code}
                                className={`relative bg-gray-800/80 backdrop-blur border rounded-2xl p-6 ${plan.code === 'regional'
                                        ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                                        : 'border-gray-700'
                                    }`}
                            >
                                {/* Most Popular Badge */}
                                {plan.code === 'regional' && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                                        MÁS POPULAR
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    {plan.cities_included === 999 ? 'Cobertura total' : `${plan.cities_included} ciudad${plan.cities_included > 1 ? 'es' : ''}`}
                                    {' • '}{plan.duration_months} mes{plan.duration_months > 1 ? 'es' : ''}
                                </p>

                                {/* Price */}
                                <div className="mb-6">
                                    {plan.is_promo_active && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-gray-500 line-through text-lg">
                                                {formatPrice(plan.regular_price_usd)}
                                            </span>
                                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                                -{plan.discount_percent}%
                                            </span>
                                        </div>
                                    )}
                                    <div className="text-4xl font-bold text-white">
                                        {formatPrice(plan.current_price_usd)}
                                        <span className="text-lg text-gray-400 font-normal"> USD</span>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-2 mb-6">
                                    {(plan.features || [
                                        'Todos los espacios publicitarios',
                                        'Analytics incluido',
                                        'Soporte prioritario'
                                    ]).slice(0, 4).map((feature, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                            <span>{typeof feature === 'string' ? feature : feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to={`/enterprise/contact?plan=${plan.code}`}
                                    className={`block text-center py-3 px-4 rounded-xl font-semibold transition-all ${plan.code === 'regional'
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/30'
                                            : 'bg-gray-700 text-white hover:bg-gray-600'
                                        }`}
                                >
                                    Solicitar
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* Payment Methods Note */}
                    <div className="text-center mt-8 text-gray-400 text-sm">
                        <Shield className="w-4 h-4 inline-block mr-1" />
                        Pagos seguros vía tarjeta de crédito o transferencia bancaria.
                        <br />
                        <span className="text-xs">No aceptamos efectivo para garantizar facturación fiscal correcta.</span>
                    </div>
                </div>
            </section>

            {/* Use Cases / Case Studies */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                        Casos de Uso Ideales
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: 'FIFA World Cup 2026',
                                emoji: '⚽',
                                desc: 'Marca de vinos franceses promocionando en Los Angeles, Dallas y Miami durante el mundial.',
                                results: '5M+ impresiones estimadas'
                            },
                            {
                                title: 'Super Bowl LXII',
                                emoji: '🏈',
                                desc: 'Cervecería artesanal mexicana llegando a la audiencia hispana en Phoenix.',
                                results: '2M+ impresiones estimadas'
                            },
                            {
                                title: 'F1 Las Vegas GP',
                                emoji: '🏎️',
                                desc: 'Marca de lujo europea promocionando durante el Gran Premio de Las Vegas.',
                                results: '3M+ impresiones estimadas'
                            }
                        ].map((useCase, i) => (
                            <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
                                <div className="text-5xl mb-4">{useCase.emoji}</div>
                                <h3 className="text-xl font-bold text-white mb-2">{useCase.title}</h3>
                                <p className="text-gray-400 mb-4">{useCase.desc}</p>
                                <div className="inline-block bg-green-500/20 text-green-400 text-sm font-medium px-3 py-1 rounded-full">
                                    {useCase.results}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-gray-700/50 backdrop-blur rounded-3xl p-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        ¿Listo para escalar tu marca globalmente?
                    </h2>
                    <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                        Nuestro equipo de ventas enterprise te contactará en menos de 24 horas
                        para diseñar una estrategia personalizada.
                    </p>
                    <Link
                        to="/enterprise/contact"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all"
                    >
                        Hablar con Ventas
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
