// src/pages/en/IndustriesPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import {
    UtensilsCrossed, Scissors, Car, Heart, ShoppingBag, Home,
    Dumbbell, Stethoscope, GraduationCap, Wrench, Coffee, Pill,
    ArrowRight, CheckCircle
} from 'lucide-react';

/**
 * English Industries/Verticals Page for international advertisers
 * SEO keywords: "restaurant advertising Mexico", "beauty business Mexico",
 * "auto repair directory Mexico"
 */
const IndustriesPage = () => {
    const industries = [
        {
            icon: <UtensilsCrossed className="w-8 h-8" />,
            name: 'Restaurants & Food',
            description: 'Taquerías, restaurants, cafés, bakeries, food trucks, and catering services.',
            stats: 'Largest category on Geobooker',
            color: 'from-orange-400 to-red-500',
            bgLight: 'bg-orange-50',
            searches: ['restaurants near me', 'taquería', 'bakery nearby']
        },
        {
            icon: <Scissors className="w-8 h-8" />,
            name: 'Beauty & Personal Care',
            description: 'Barbershops, hair salons, nail salons, spas, and beauty clinics.',
            stats: 'Highest repeat customer rate',
            color: 'from-pink-400 to-purple-500',
            bgLight: 'bg-pink-50',
            searches: ['barbershop near me', 'salon de belleza', 'nail salon']
        },
        {
            icon: <Car className="w-8 h-8" />,
            name: 'Automotive',
            description: 'Auto repair, tire shops, car washes, gas stations, and auto parts.',
            stats: 'High-value transactions',
            color: 'from-blue-400 to-cyan-500',
            bgLight: 'bg-blue-50',
            searches: ['mechanic near me', 'vulcanizadora', 'car wash']
        },
        {
            icon: <Stethoscope className="w-8 h-8" />,
            name: 'Healthcare',
            description: 'Clinics, dentists, pharmacies, veterinarians, and specialist doctors.',
            stats: 'Critical local searches',
            color: 'from-green-400 to-emerald-500',
            bgLight: 'bg-green-50',
            searches: ['pharmacy near me', 'dentist', 'veterinario cerca']
        },
        {
            icon: <ShoppingBag className="w-8 h-8" />,
            name: 'Retail & Shopping',
            description: 'Supermarkets, convenience stores, clothing shops, and electronics.',
            stats: 'Growing digital-first segment',
            color: 'from-yellow-400 to-orange-500',
            bgLight: 'bg-yellow-50',
            searches: ['supermarket near me', 'tienda', 'clothing store']
        },
        {
            icon: <Home className="w-8 h-8" />,
            name: 'Home Services',
            description: 'Plumbers, electricians, cleaners, locksmiths, and home improvement.',
            stats: 'Highest urgency searches',
            color: 'from-teal-400 to-green-500',
            bgLight: 'bg-teal-50',
            searches: ['plumber near me', 'electrician', 'cerrajero 24hrs']
        },
        {
            icon: <Dumbbell className="w-8 h-8" />,
            name: 'Fitness & Wellness',
            description: 'Gyms, yoga studios, sports centers, and wellness clinics.',
            stats: 'Fast-growing vertical',
            color: 'from-violet-400 to-purple-500',
            bgLight: 'bg-violet-50',
            searches: ['gym near me', 'yoga studio', 'gimnasio']
        },
        {
            icon: <GraduationCap className="w-8 h-8" />,
            name: 'Education',
            description: 'Schools, tutoring centers, language academies, and training institutes.',
            stats: 'Seasonal demand peaks',
            color: 'from-indigo-400 to-blue-500',
            bgLight: 'bg-indigo-50',
            searches: ['school near me', 'English academy', 'escuela de idiomas']
        }
    ];

    return (
        <>
            <SEO
                title="Industries — Advertising for Every Business Type | Geobooker"
                description="Geobooker connects customers with local businesses across 50+ categories: restaurants, beauty, automotive, healthcare, retail, and more. See how your industry can grow with targeted advertising in Mexico."
            />

            <div className="min-h-screen bg-white">
                {/* Hero */}
                <section className="bg-gradient-to-br from-slate-50 to-indigo-50 py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Every Industry Thrives on Geobooker
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            From restaurants to healthcare, discover how businesses like yours reach local customers in Mexico.
                        </p>
                    </div>
                </section>

                {/* Industries Grid */}
                <section className="max-w-6xl mx-auto px-4 py-16">
                    <div className="grid md:grid-cols-2 gap-8">
                        {industries.map((ind, i) => (
                            <div
                                key={i}
                                className={`${ind.bgLight} rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${ind.color} flex items-center justify-center text-white flex-shrink-0`}>
                                        {ind.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">{ind.name}</h3>
                                        <p className="text-gray-600 text-sm mb-3">{ind.description}</p>
                                        <div className="flex items-center gap-2 text-sm mb-3">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span className="text-green-700 font-medium">{ind.stats}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {ind.searches.map((s, j) => (
                                                <span key={j} className="text-xs bg-white/80 text-gray-600 px-2 py-1 rounded-lg border border-gray-200">
                                                    "{s}"
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Why Geobooker */}
                <section className="bg-gray-50 py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">
                            Why Local Businesses Choose Geobooker
                        </h2>
                        <div className="grid md:grid-cols-3 gap-8 mt-8">
                            {[
                                { title: 'Intent-Based Traffic', desc: 'Users are actively searching for your type of business — not just browsing.' },
                                { title: 'Affordable Entry', desc: 'Free listing for all businesses. Premium ads start at just $25 USD/month.' },
                                { title: 'Multi-Language Reach', desc: 'Reach locals, tourists, and expats in Mexico with ads in 6 languages.' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-gray-600 text-sm">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">
                            Start reaching customers in your industry today
                        </h2>
                        <p className="text-xl text-indigo-100 mb-8">
                            List your business for free, or boost visibility with our advertising plans.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/signup"
                                className="inline-flex items-center px-8 py-4 bg-white text-indigo-700 rounded-xl font-bold text-lg hover:bg-indigo-50 transition"
                            >
                                List Your Business Free <ArrowRight className="ml-2 w-5 h-5" />
                            </Link>
                            <Link
                                to="/en/pricing"
                                className="inline-flex items-center px-8 py-4 border-2 border-white/50 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition"
                            >
                                See Pricing
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default IndustriesPage;
