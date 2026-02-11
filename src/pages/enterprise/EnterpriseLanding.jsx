// src/pages/enterprise/EnterpriseLanding.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
    Globe, TrendingUp, Users, MapPin, Star, ArrowRight,
    CheckCircle, Clock, Zap, Shield, BarChart3, Target,
    Building2, Calendar, Languages, Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';

export default function EnterpriseLanding() {
    const { t, i18n } = useTranslation();
    const [pricing, setPricing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [promoEndDate, setPromoEndDate] = useState(null);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

    useEffect(() => {
        fetchPricing();
    }, []);

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
        }, 60000);

        return () => clearInterval(timer);
    }, [promoEndDate]);

    const fetchPricing = async () => {
        try {
            const { data, error } = await supabase.rpc('get_enterprise_pricing');
            if (error) throw error;

            if (data && data.length > 0) {
                setPricing(data);
                setPromoEndDate(data[0].promo_ends_at);

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
                title={t('enterprise.seoTitle')}
                description={t('enterprise.seoDescription')}
            />

            {/* Promo Banner Sticky */}
            <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <span className="font-bold">🚀 {t('enterprise.promoBanner')}</span>
                        <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="opacity-90">{t('enterprise.offerEnds')}:</span>
                        <div className="flex gap-2">
                            <div className="bg-white/20 backdrop-blur px-2 py-1 rounded">
                                <span className="font-bold">{timeLeft.days}</span> {t('enterprise.days')}
                            </div>
                            <div className="bg-white/20 backdrop-blur px-2 py-1 rounded">
                                <span className="font-bold">{timeLeft.hours}</span> {t('enterprise.hours')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative py-20 px-4 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-orange-600/20 to-pink-600/20 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-600/30 backdrop-blur-sm text-blue-300 px-4 py-2 rounded-full mb-6">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('enterprise.badge')}</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                        {t('enterprise.heroTitle1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">{t('enterprise.heroHighlight')}</span>
                        <br />{t('enterprise.heroTitle2')}
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                        FIFA 2026 • Super Bowl • Olympics • Global Festivals
                        <br />
                        <span className="text-lg text-gray-400">{t('enterprise.heroSubtitle')}</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <Link
                            to="/enterprise/checkout"
                            className="group bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all flex items-center gap-2"
                        >
                            {t('enterprise.ctaGetStarted')}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#pricing"
                            className="text-gray-300 hover:text-white px-6 py-4 rounded-xl font-medium border border-gray-700 hover:border-gray-500 transition-colors"
                        >
                            {t('enterprise.ctaViewPricing')}
                        </a>
                    </div>

                    <div className="flex items-center justify-center gap-8 opacity-50">
                        <span className="text-gray-500 text-sm">{t('enterprise.idealFor')}:</span>
                        <div className="flex items-center gap-6 text-gray-400 text-sm">
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {t('enterprise.beverages')}</span>
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {t('enterprise.automotive')}</span>
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
                        { value: '10M+', label: t('enterprise.statsImpressions'), icon: TrendingUp },
                        { value: '50+', label: t('enterprise.statsCities'), icon: MapPin },
                        { value: '4.8★', label: t('enterprise.statsSatisfaction'), icon: Star },
                        { value: '150%', label: t('enterprise.statsRoi'), icon: BarChart3 }
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
                        {t('enterprise.whyGeobooker')}
                    </h2>
                    <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
                        {t('enterprise.whySubtitle')}
                    </p>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[
                            { icon: Target, title: t('enterprise.featurePrecise'), desc: t('enterprise.featurePreciseDesc'), color: 'text-blue-400 bg-blue-400/10' },
                            { icon: Languages, title: t('enterprise.featureMultilingual'), desc: t('enterprise.featureMultilingualDesc'), color: 'text-green-400 bg-green-400/10' },
                            { icon: Calendar, title: t('enterprise.featureEvents'), desc: t('enterprise.featureEventsDesc'), color: 'text-purple-400 bg-purple-400/10' },
                            { icon: BarChart3, title: t('enterprise.featureAnalytics'), desc: t('enterprise.featureAnalyticsDesc'), color: 'text-amber-400 bg-amber-400/10' },
                            { icon: Shield, title: t('enterprise.featureSafety'), desc: t('enterprise.featureSafetyDesc'), color: 'text-red-400 bg-red-400/10' },
                            { icon: Users, title: t('enterprise.featureManager'), desc: t('enterprise.featureManagerDesc'), color: 'text-cyan-400 bg-cyan-400/10' },
                            // Nuevos beneficios internacionalizados
                            { icon: Clock, title: t('enterprise.featureHours'), desc: t('enterprise.featureHoursDesc'), color: 'text-teal-400 bg-teal-400/10' },
                            { icon: MapPin, title: t('enterprise.featureAlwaysMap'), desc: t('enterprise.featureAlwaysMapDesc'), color: 'text-pink-400 bg-pink-400/10' },
                            { icon: Building2, title: t('enterprise.featureMultiLocation'), desc: t('enterprise.featureMultiLocationDesc'), color: 'text-orange-400 bg-orange-400/10' },
                            { icon: Sparkles, title: t('enterprise.featureReferralProg'), desc: t('enterprise.featureReferralProgDesc'), color: 'text-indigo-400 bg-indigo-400/10' }
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
                            <span className="font-bold">{t('enterprise.launchPromo')}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            {t('enterprise.pricingTitle')}
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            {t('enterprise.pricingSubtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {pricing.map((plan) => (
                            <div
                                key={plan.code}
                                className={`relative bg-gray-800/80 backdrop-blur border rounded-2xl p-6 ${plan.code === 'regional'
                                    ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                                    : 'border-gray-700'
                                    }`}
                            >
                                {plan.code === 'regional' && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                                        {t('enterprise.mostPopular')}
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    {plan.cities_included === 999
                                        ? t('enterprise.fullCoverage')
                                        : `${plan.cities_included} ${plan.cities_included > 1 ? t('enterprise.cities') : t('enterprise.city')}`}
                                    {' • '}{plan.duration_months} {plan.duration_months > 1 ? t('enterprise.months') : t('enterprise.month')}
                                </p>

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

                                <ul className="space-y-2 mb-6">
                                    {[
                                        t('enterprise.featureAllSpaces'),
                                        t('enterprise.featureAnalyticsIncluded'),
                                        t('enterprise.featurePrioritySupport')
                                    ].map((feature, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to={`/enterprise/checkout?plan=${plan.code}`}
                                    className={`block text-center py-3 px-4 rounded-xl font-semibold transition-all ${plan.code === 'regional'
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/30'
                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                        }`}
                                >
                                    {t('enterprise.getStarted')}
                                </Link>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-8 text-gray-400 text-sm">
                        <Shield className="w-4 h-4 inline-block mr-1" />
                        {t('enterprise.securePayments')}
                        <br />
                        <span className="text-xs">{t('enterprise.noCashNote')}</span>
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                        {t('enterprise.useCasesTitle')}
                    </h2>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: 'FIFA World Cup 2026', emoji: '⚽', desc: t('enterprise.useCaseFifa'), results: t('enterprise.useCaseFifaResult') },
                            { title: 'Super Bowl LXII', emoji: '🏈', desc: t('enterprise.useCaseSuperbowl'), results: t('enterprise.useCaseSuperbowlResult') },
                            { title: 'F1 Las Vegas GP', emoji: '🏎️', desc: t('enterprise.useCaseF1'), results: t('enterprise.useCaseF1Result') },
                            { title: t('enterprise.useCasePharmacyTitle', 'Lanzamiento de Sucursal'), emoji: '🏬', desc: t('enterprise.useCasePharmacy'), results: t('enterprise.useCasePharmacyResult') },
                            { title: t('enterprise.useCaseBeverageTitle', 'Conciertos y Festivales'), emoji: '🎤', desc: t('enterprise.useCaseBeverage'), results: t('enterprise.useCaseBeverageResult') },
                            { title: t('enterprise.useCaseBankTitle', 'Campaña Segmentada'), emoji: '🎯', desc: t('enterprise.useCaseBank'), results: t('enterprise.useCaseBankResult') }
                        ].map((useCase, i) => (
                            <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 text-center hover:border-gray-600 transition">
                                <div className="text-5xl mb-4">{useCase.emoji}</div>
                                <h3 className="text-xl font-bold text-white mb-2">{useCase.title}</h3>
                                <p className="text-gray-400 mb-4 text-sm">{useCase.desc}</p>
                                <div className="inline-block bg-green-500/20 text-green-400 text-sm font-medium px-3 py-1 rounded-full">
                                    {useCase.results}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Data & KPIs Section */}
            <section className="py-20 px-4 bg-gradient-to-b from-slate-900 via-blue-900/20 to-slate-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-sm text-green-400 px-4 py-2 rounded-full mb-4">
                            <BarChart3 className="w-4 h-4" />
                            <span className="font-bold">📊 {t('enterprise.kpisTitle')}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            {t('enterprise.kpisSubtitle')}
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            {t('enterprise.kpisDesc')}
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                        {[
                            { value: '10M+', label: 'Impresiones/mes', icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
                            { value: '50+', label: 'Ciudades', icon: MapPin, color: 'from-green-500 to-emerald-500' },
                            { value: '4.8★', label: 'Satisfacción', icon: Star, color: 'from-yellow-500 to-orange-500' },
                            { value: '150%', label: 'ROI Promedio', icon: BarChart3, color: 'from-purple-500 to-pink-500' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6 text-center hover:border-gray-600 transition">
                                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-gray-400 text-sm">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* KPIs & Features Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Live Data */}
                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{t('enterprise.kpiRealTime')}</h3>
                            </div>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                {(t('enterprise.kpiRealTimeItems', { returnObjects: true }) || []).map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> {item}</li>
                                ))}
                            </ul>
                        </div>

                        {/* KPIs Measured */}
                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{t('enterprise.kpiMeasured')}</h3>
                            </div>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                {(t('enterprise.kpiMeasuredItems', { returnObjects: true }) || []).map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> {item}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Optimization */}
                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
                                    <Target className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{t('enterprise.kpiOptimization')}</h3>
                            </div>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                {(t('enterprise.kpiOptimizationItems', { returnObjects: true }) || []).map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> {item}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Weekly Reports */}
                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{t('enterprise.kpiReports')}</h3>
                            </div>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                {(t('enterprise.kpiReportsItems', { returnObjects: true }) || []).map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> {item}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Segmentation */}
                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{t('enterprise.kpiSegmentation')}</h3>
                            </div>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                {(t('enterprise.kpiSegmentationItems', { returnObjects: true }) || []).map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> {item}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Dedicated Support */}
                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">{t('enterprise.kpiSupport')}</h3>
                            </div>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                {(t('enterprise.kpiSupportItems', { returnObjects: true }) || []).map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> {item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Guarantee Banner */}
                    <div className="mt-12 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Shield className="w-6 h-6 text-green-400" />
                            <h3 className="text-xl font-bold text-white">{t('enterprise.guaranteeTitle')}</h3>
                        </div>
                        <p className="text-gray-300 max-w-2xl mx-auto">
                            <Trans i18nKey="enterprise.guaranteeDesc">
                                Si en cualquier momento no tienes acceso a tus métricas o reportes, te extendemos tu campaña <strong className="text-green-400">+15 días gratis</strong>.
                            </Trans>
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-gray-700/50 backdrop-blur rounded-3xl p-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        {t('enterprise.ctaFinalTitle')}
                    </h2>
                    <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                        {t('enterprise.ctaFinalSubtitle')}
                    </p>
                    <Link
                        to="/enterprise/checkout"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all"
                    >
                        {t('enterprise.ctaTalkToSales')}
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
