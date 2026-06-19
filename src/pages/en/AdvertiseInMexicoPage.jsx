// src/pages/en/AdvertiseInMexicoPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import {
    Globe,
    TrendingUp,
    MapPin,
    BarChart3,
    Users,
    Shield,
    CheckCircle,
    ArrowRight,
    Target,
    DollarSign
} from 'lucide-react';

const AdvertiseInMexicoPage = () => {
    const features = [
        {
            icon: <MapPin className="w-6 h-6" />,
            title: 'Geo-Targeted Advertising',
            desc: 'Reach customers in specific Mexican cities and neighborhoods with local precision.'
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: 'High-Intent Audience',
            desc: 'Connect with people actively searching for local businesses, services, and experiences.'
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: 'Real-Time Analytics',
            desc: 'Track impressions, clicks, CTR, and campaign performance with live reporting.'
        },
        {
            icon: <Globe className="w-6 h-6" />,
            title: 'Multilingual Campaigns',
            desc: 'Run creatives in English and Spanish for tourists, expats, and local audiences.'
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: 'Brand-Safe Environment',
            desc: 'Your campaigns appear inside a trusted local discovery platform with controlled placements.'
        },
        {
            icon: <Target className="w-6 h-6" />,
            title: 'Category Targeting',
            desc: 'Focus your spend on verticals like restaurants, beauty, automotive, healthcare, and more.'
        }
    ];

    const adFormats = [
        { name: 'Hero Banner', position: 'Homepage top section', reach: 'Maximum visibility', price: 'From $45 USD/mo' },
        { name: 'Featured Carousel', position: 'Homepage discovery feed', reach: 'High engagement', price: 'From $30 USD/mo' },
        { name: 'Sponsored Results', position: 'Search results', reach: 'Intent-driven traffic', price: 'From $25 USD/mo' },
        { name: 'Enterprise Global', position: 'Multi-city and cross-border', reach: 'Custom scale', price: '70% off through Sep 1, 2026' }
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
                title="Advertise in Mexico - Reach Local Customers with Geobooker"
                description="Promote your brand to customers actively searching for local businesses in Mexico. Geo-targeted ads, multilingual campaigns, and enterprise global pricing with 70% off through September 1, 2026."
                type="website"
            />

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
                        description: 'Geo-targeted digital advertising platform for brands and local businesses in Mexico.',
                        areaServed: { '@type': 'Country', name: 'Mexico' },
                        serviceType: 'Digital Advertising'
                    })
                }}
            />

            <div className="min-h-screen bg-white">
                <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                    </div>

                    <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
                        <div className="text-center">
                            <span className="inline-block px-4 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-100 text-sm font-medium mb-6">
                                70% Off Global Enterprise Pricing - Through Sep 1, 2026
                            </span>
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                Advertise in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Mexico</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8">
                                Reach customers searching for businesses in Mexico with geo-targeted ads, live analytics, and scalable enterprise campaigns.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/advertise"
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-blue-50 transition"
                                >
                                    Explore Ad Formats
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    to="/enterprise/contact"
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition"
                                >
                                    Contact Enterprise Sales
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-4 py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-200">
                                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                                <div className="text-sm text-slate-600 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-slate-50 py-16 px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why brands choose Geobooker</h2>
                            <p className="text-slate-600 max-w-2xl mx-auto">
                                Launch local campaigns fast or scale into enterprise global activations across multiple cities and customer segments.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature) => (
                                <div key={feature.title} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                                    <p className="text-slate-600 text-sm leading-6">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-4 py-16">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Available advertising formats</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            Choose a placement based on visibility, intent, and campaign scale.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {adFormats.map((format) => (
                            <div key={format.name} className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                                <div className="flex items-center gap-2 mb-3 text-blue-700">
                                    <DollarSign className="w-5 h-5" />
                                    <span className="font-semibold">{format.name}</span>
                                </div>
                                <p className="text-sm text-slate-500 mb-2">{format.position}</p>
                                <p className="text-sm text-slate-700 mb-3">{format.reach}</p>
                                <p className="text-lg font-bold text-slate-900">{format.price}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-slate-900 text-white py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-cyan-300" />
                        <h2 className="text-3xl font-bold mb-4">Ready to grow in Mexico?</h2>
                        <p className="text-slate-300 max-w-2xl mx-auto mb-8">
                            Start with local placements or request an enterprise global proposal with 70% off pricing through September 1, 2026.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/advertise"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-400 text-slate-950 rounded-xl font-semibold hover:bg-cyan-300 transition"
                            >
                                View Pricing
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                to="/enterprise/contact"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 rounded-xl font-semibold hover:bg-white/10 transition"
                            >
                                Request Proposal
                            </Link>
                        </div>

                        <div className="mt-10 grid sm:grid-cols-2 gap-4 text-left">
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                <div className="flex items-center gap-2 mb-3 text-cyan-300">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-semibold">Built for international brands</span>
                                </div>
                                <p className="text-sm text-slate-300">
                                    Great for agencies, tourism boards, event sponsors, franchise groups, and cross-border launches.
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                <div className="flex items-center gap-2 mb-3 text-cyan-300">
                                    <Shield className="w-5 h-5" />
                                    <span className="font-semibold">Measured and accountable</span>
                                </div>
                                <p className="text-sm text-slate-300">
                                    Campaigns include reporting visibility, geographic reach, and support from the Geobooker team.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default AdvertiseInMexicoPage;
