// src/pages/en/AdvertiseInMexicoPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import {
    Globe, TrendingUp, MapPin, BarChart3, Users, Shield,
    CheckCircle, ArrowRight, Star, Zap, Target, DollarSign
} from 'lucide-react';

/**
 * English B2B Landing Page targeting European/US advertisers
 * SEO keywords: "advertise in Mexico", "local business directory Mexico",
 * "increase foot traffic Mexico", "digital advertising Mexico"
 */
const AdvertiseInMexicoPage = () => {
    const features = [
        {
            icon: <MapPin className="w-6 h-6" />,
            title: 'Geo-Targeted Advertising',
            desc: 'Reach customers within specific Mexican cities and neighborhoods. Pin-point accuracy for local campaigns.'
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: 'Growing Audience',
            desc: 'Access thousands of active users searching for local businesses every day across Mexico.'
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: 'Real-Time Analytics',
            desc: 'Track impressions, clicks, CTR, and conversions with our live dashboard. Know exactly what works.'
        },
        {
            icon: <Globe className="w-6 h-6" />,
            title: 'Multilingual Campaigns',
            desc: 'Run ads in Spanish, English, or both. Reach tourists, expats, and locals simultaneously.'
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: 'Brand Safety',
            desc: 'Your ads appear in a trusted business directory context — no controversial content, no surprises.'
        },
        {
            icon: <Target className="w-6 h-6" />,
            title: 'Category Targeting',
            desc: 'Target specific business categories: restaurants, beauty, automotive, healthcare, and 50+ more.'
        }
    ];

    const adFormats = [
        { name: 'Hero Banner', position: 'Top of homepage', reach: 'Maximum visibility', price: 'From $45 USD/mo' },
        { name: 'Featured Carousel', position: 'Homepage feed', reach: 'High engagement', price: 'From $30 USD/mo' },
        { name: 'Sponsored Results', position: 'Search results', reach: 'Intent-based', price: 'From $25 USD/mo' },
        { name: 'Interstitial', position: 'Full screen', reach: 'Maximum impact', price: 'From $60 USD/mo' }
    ];

    const stats = [
        { value: '10,000+', label: 'Monthly Searches' },
        { value: '6', label: 'Languages Supported' },
        { value: '50+', label: 'Business Categories' },
        { value: '24/7', label: 'Live Analytics' }
    ];

    return (
        <>
            <SEO
                title="Advertise in Mexico — Reach Local Customers with Geobooker"
                description="Promote your brand to thousands of customers actively searching for local businesses in Mexico. Geo-targeted ads, real-time analytics, multilingual campaigns. Start from $25 USD/month."
                type="website"
            />

            {/* JSON-LD Service schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Service',
                        name: 'Geobooker Advertising',
                        provider: {
                            '@type': 'Organization',
                            name: 'Geobooker'
                        },
                        description: 'Geo-targeted digital advertising platform for businesses in Mexico. Reach local customers with banner ads, sponsored results, and more.',
                        areaServed: { '@type': 'Country', name: 'Mexico' },
                        serviceType: 'Digital Advertising',
                        offers: {
                            '@type': 'AggregateOffer',
                            lowPrice: '25',
                            highPrice: '500',
                            priceCurrency: 'USD',
                            offerCount: '4'
                        }
                    })
                }}
            />

            <div className="min-h-screen bg-white">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                    </div>

                    <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
                        <div className="text-center">
                            <span className="inline-block px-4 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-medium mb-6">
                                🚀 70% Launch Discount — Limited Time
                            </span>
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                Advertise in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Mexico</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8">
                                Reach thousands of customers actively searching for local businesses.
                                Geo-targeted ads with real-time analytics.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/advertise"
                                    className="inline-flex items-center px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition shadow-lg shadow-blue-500/30"
                                >
                                    Start Advertising <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                                <Link
                                    to="/enterprise/contact"
                                    className="inline-flex items-center px-8 py-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white rounded-xl font-bold text-lg transition"
                                >
                                    Talk to Sales
                                </Link>
                            </div>
                        </div>

                        {/* Stats Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
                            {stats.map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl font-bold text-white">{stat.value}</div>
                                    <div className="text-blue-300 text-sm mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Advertise Section */}
                <section className="max-w-6xl mx-auto px-4 py-20">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Why Advertise on Geobooker?
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Mexico's fastest-growing local business directory. Your ads reach people with real purchase intent.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow border border-gray-100">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                                    {f.icon}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                                <p className="text-gray-600">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Ad Formats */}
                <section className="bg-gray-50 py-20">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="text-center mb-14">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                Ad Formats & Pricing
                            </h2>
                            <p className="text-lg text-gray-600">
                                Choose the format that fits your goals. All include real-time analytics dashboard.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {adFormats.map((format, i) => (
                                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:border-blue-300 transition">
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">{format.name}</h3>
                                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            {format.position}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            {format.reach}
                                        </div>
                                    </div>
                                    <div className="text-blue-600 font-bold">{format.price}</div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <Link
                                to="/advertise"
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                            >
                                See Full Pricing <ArrowRight className="ml-2 w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="max-w-6xl mx-auto px-4 py-20">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-14">
                        How It Works
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: '1', title: 'Choose Your Format', desc: 'Select from banners, carousels, sponsored results, or interstitials. Pick your target cities and categories.' },
                            { step: '2', title: 'Launch Your Campaign', desc: 'Upload your creative, set your budget, and go live. Our team reviews and approves within 24 hours.' },
                            { step: '3', title: 'Track & Optimize', desc: 'Monitor impressions, clicks, and conversions in real-time. Adjust targeting and budget anytime.' }
                        ].map((item, i) => (
                            <div key={i} className="text-center">
                                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
                                    {item.step}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-gray-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Ready to grow your business in Mexico?
                        </h2>
                        <p className="text-xl text-blue-100 mb-8">
                            Join hundreds of businesses already reaching local customers through Geobooker.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/advertise"
                                className="inline-flex items-center px-8 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-blue-50 transition"
                            >
                                <DollarSign className="mr-2 w-5 h-5" /> View Pricing
                            </Link>
                            <a
                                href="mailto:ventas@geobooker.com"
                                className="inline-flex items-center px-8 py-4 border-2 border-white/50 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition"
                            >
                                Contact Sales
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default AdvertiseInMexicoPage;
