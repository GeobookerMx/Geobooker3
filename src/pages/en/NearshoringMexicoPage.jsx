// src/pages/en/NearshoringMexicoPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import {
    Globe,
    TrendingUp,
    MapPin,
    Building2,
    Truck,
    Factory,
    DollarSign,
    Shield,
    Users,
    ArrowRight,
    CheckCircle,
    BarChart3,
    Zap,
    Package
} from 'lucide-react';

/**
 * Premium SEO landing page for "Nearshoring Mexico" — the highest-value B2B keyword
 * Targets: US, Canadian, German, and European companies relocating supply chains to Mexico
 */
const NearshoringMexicoPage = () => {
    const nearshoringBenefits = [
        {
            icon: <MapPin className="w-7 h-7" />,
            title: 'Geographic Proximity',
            desc: 'Mexico shares a 3,145 km border with the US. Same-day shipping to major US markets. Central timezone alignment with North American operations.',
            stat: '3,145 km',
            statLabel: 'US-Mexico border'
        },
        {
            icon: <DollarSign className="w-7 h-7" />,
            title: 'Cost Advantage',
            desc: 'Manufacturing costs 20-30% lower than the US and 15% lower than China when factoring logistics, tariffs, and USMCA trade benefits.',
            stat: '20-30%',
            statLabel: 'cost savings vs US'
        },
        {
            icon: <Shield className="w-7 h-7" />,
            title: 'USMCA Trade Agreement',
            desc: 'Duty-free access to the US and Canadian markets under the United States-Mexico-Canada Agreement. Reduced tariff risk vs Asian sourcing.',
            stat: '$0',
            statLabel: 'tariffs under USMCA'
        },
        {
            icon: <Users className="w-7 h-7" />,
            title: 'Skilled Workforce',
            desc: 'Over 130,000 engineering graduates annually. Mexico is the #1 exporter of engineers in Latin America. Bilingual talent pool in border cities.',
            stat: '130K+',
            statLabel: 'engineers/year'
        },
        {
            icon: <Factory className="w-7 h-7" />,
            title: 'Industrial Infrastructure',
            desc: 'World-class industrial parks, free trade zones (maquiladoras), and established automotive, aerospace, and electronics manufacturing clusters.',
            stat: '400+',
            statLabel: 'industrial parks'
        },
        {
            icon: <Globe className="w-7 h-7" />,
            title: 'Trade Network',
            desc: 'Mexico has 50+ free trade agreements covering 80% of global GDP. Access to EU, Pacific Alliance, and CPTPP markets through Mexican operations.',
            stat: '50+',
            statLabel: 'trade agreements'
        }
    ];

    const keyIndustries = [
        {
            name: 'Automotive & EV',
            desc: 'Mexico is the world\'s 7th largest auto manufacturer. Tesla, BMW, Audi, KIA, GM, and Ford all have major operations.',
            cities: 'Monterrey, Saltillo, Puebla, Aguascalientes, San Luis Potosí',
            icon: '🚗'
        },
        {
            name: 'Aerospace & Defense',
            desc: '400+ aerospace companies, $10B+ in exports. Bombardier, Safran, and Honeywell operate large facilities.',
            cities: 'Querétaro, Chihuahua, Baja California',
            icon: '✈️'
        },
        {
            name: 'Electronics & Semiconductors',
            desc: 'Foxconn, Samsung, LG, and Bosch have manufacturing plants. Growing chip packaging and testing capacity.',
            cities: 'Guadalajara, Tijuana, Ciudad Juárez',
            icon: '🔌'
        },
        {
            name: 'Medical Devices',
            desc: 'Baja California is a global hub for medical device manufacturing. Becton Dickinson, Medtronic, and Cardinal Health present.',
            cities: 'Tijuana, Ciudad Juárez, Monterrey',
            icon: '🏥'
        },
        {
            name: 'Logistics & Supply Chain',
            desc: 'Strategic port infrastructure (Manzanillo, Lázaro Cárdenas, Veracruz) and rail connectivity to US markets.',
            cities: 'Monterrey, Laredo/Nuevo Laredo, Manzanillo',
            icon: '📦'
        },
        {
            name: 'IT & Software Services',
            desc: 'Growing tech talent pool in Guadalajara ("Mexico\'s Silicon Valley"), CDMX, and Monterrey.',
            cities: 'Guadalajara, Mexico City, Monterrey',
            icon: '💻'
        }
    ];

    const geobookerValue = [
        {
            icon: <MapPin className="w-6 h-6" />,
            title: 'Find Local Suppliers',
            desc: 'Search for industrial suppliers, freight companies, customs brokers, and service providers in any Mexican city using our directory of 500,000+ businesses.'
        },
        {
            icon: <Building2 className="w-6 h-6" />,
            title: 'Discover Industrial Parks',
            desc: 'Explore industrial zones, free trade areas, and business clusters near your target manufacturing location.'
        },
        {
            icon: <Truck className="w-6 h-6" />,
            title: 'Logistics Partners',
            desc: 'Find trucking companies, freight forwarders, customs agents, and cross-border logistics providers through our integrated Todo Transporte network.'
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: 'Market Intelligence',
            desc: 'Understand local business density, competition, and service availability in specific Mexican cities before you commit.'
        }
    ];

    const faqs = [
        {
            q: 'What is nearshoring and why Mexico?',
            a: 'Nearshoring is the practice of relocating manufacturing or services to a nearby country. Mexico is the top nearshoring destination for US and Canadian companies due to its shared border, USMCA trade benefits, competitive labor costs, and world-class industrial infrastructure. Since 2020, Mexico has attracted over $35 billion in new FDI from companies diversifying from China.'
        },
        {
            q: 'How can Geobooker help with my nearshoring strategy?',
            a: 'Geobooker provides a comprehensive directory of 500,000+ Mexican businesses including industrial suppliers, logistics companies, customs brokers, legal firms, and service providers. You can search by city, industry, and specific service needs — even in English. Our B2B Connect service can also provide curated lead lists for your specific industry.'
        },
        {
            q: 'Which Mexican cities are best for nearshoring?',
            a: 'It depends on your industry. Monterrey is ideal for automotive and heavy industry. Guadalajara for electronics and tech. Querétaro for aerospace. Tijuana and Ciudad Juárez for medical devices and electronics. Mexico City for IT services and corporate headquarters. Use Geobooker to explore businesses in each city.'
        },
        {
            q: 'What are the tax benefits of manufacturing in Mexico?',
            a: 'Mexico offers several incentives: IMMEX (maquiladora) programs allow duty-free import of raw materials for export manufacturing. Special Economic Zones (ZEE) offer reduced income tax rates. The USMCA agreement provides tariff-free access to US and Canadian markets for qualifying goods.'
        },
        {
            q: 'How does Geobooker compare to traditional consulting firms for nearshoring?',
            a: 'Geobooker is not a replacement for consulting firms — we\'re a complementary tool. While consultants provide strategic advice, Geobooker gives you direct access to local business data, supplier directories, and on-the-ground service providers that you need during due diligence and operations setup.'
        }
    ];

    const testimonialStats = [
        { value: '$35B+', label: 'New FDI in Mexico since 2020' },
        { value: '7th', label: 'Largest auto manufacturer globally' },
        { value: '400+', label: 'Industrial parks nationwide' },
        { value: '130K', label: 'Engineers graduated annually' },
    ];

    return (
        <>
            <SEO
                title="Nearshoring Mexico — Find Local Suppliers & Industrial Partners | Geobooker"
                description="Discover why Mexico is the #1 nearshoring destination. Find local suppliers, logistics partners, and industrial services across 500,000+ businesses. USMCA benefits, cost savings, and skilled workforce."
                type="article"
                keywords="nearshoring Mexico, Mexico manufacturing, USMCA suppliers, Mexico industrial parks, nearshoring suppliers Mexico, Mexico factory, reshoring, supply chain Mexico"
            />

            {/* JSON-LD: Article */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: 'Nearshoring Mexico: Complete Guide to Finding Local Suppliers and Industrial Partners',
                        description: 'Comprehensive guide to nearshoring in Mexico including key industries, top cities, USMCA benefits, and how to find local suppliers using Geobooker.',
                        author: { '@type': 'Organization', name: 'Geobooker', url: 'https://www.geobooker.com' },
                        publisher: { '@type': 'Organization', name: 'Geobooker', url: 'https://www.geobooker.com' },
                        mainEntityOfPage: 'https://www.geobooker.com/en/nearshoring-mexico',
                        datePublished: '2026-08-18',
                        dateModified: '2026-08-18',
                        about: [
                            { '@type': 'Thing', name: 'Nearshoring' },
                            { '@type': 'Thing', name: 'Mexico Manufacturing' },
                            { '@type': 'Thing', name: 'USMCA' },
                            { '@type': 'Thing', name: 'Supply Chain Diversification' }
                        ]
                    })
                }}
            />

            {/* JSON-LD: FAQPage */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faqs.map(faq => ({
                            '@type': 'Question',
                            name: faq.q,
                            acceptedAnswer: { '@type': 'Answer', text: faq.a }
                        }))
                    })
                }}
            />

            {/* Hero */}
            <section className="relative bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] opacity-5" />
                <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-400/30">
                            <TrendingUp className="w-4 h-4" />
                            #1 Nearshoring Destination Worldwide
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                            Nearshoring Mexico
                            <span className="block text-emerald-300 text-3xl sm:text-4xl lg:text-5xl mt-2">
                                Find Suppliers, Partners & Services
                            </span>
                        </h1>
                        <p className="text-xl text-emerald-100 max-w-3xl mb-10 leading-relaxed">
                            Mexico is where the world's supply chains are moving. Discover 500,000+ local businesses,
                            industrial suppliers, logistics partners, and service providers across every Mexican state.
                            Powered by official government data and verified listings.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/"
                                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
                            >
                                Search Mexican Suppliers <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/enterprise"
                                className="border-2 border-emerald-400/50 hover:border-emerald-300 text-white font-semibold px-8 py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                Enterprise Solutions
                            </Link>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-8 border-t border-emerald-600/30">
                        {testimonialStats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl font-bold text-emerald-300">{stat.value}</div>
                                <div className="text-emerald-200/70 text-sm mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Nearshoring Mexico */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Companies Are Choosing Mexico</h2>
                        <p className="text-gray-600 text-lg max-w-3xl mx-auto">
                            Since 2020, over $35 billion in new foreign direct investment has flowed into Mexico
                            as companies diversify supply chains away from Asia. Here's why.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {nearshoringBenefits.map((b, i) => (
                            <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
                                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-5">
                                    {b.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{b.title}</h3>
                                <p className="text-gray-600 leading-relaxed mb-4">{b.desc}</p>
                                <div className="flex items-baseline gap-2 pt-3 border-t border-gray-100">
                                    <span className="text-2xl font-bold text-emerald-600">{b.stat}</span>
                                    <span className="text-sm text-gray-500">{b.statLabel}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Key Industries */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Key Industries for Nearshoring</h2>
                        <p className="text-gray-600 text-lg max-w-3xl mx-auto">
                            Mexico's industrial ecosystem spans automotive, aerospace, electronics, medical devices, and more.
                            Find the right city for your operation.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {keyIndustries.map((ind, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="text-4xl mb-3">{ind.icon}</div>
                                <h3 className="text-lg font-bold mb-2">{ind.name}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed mb-4">{ind.desc}</p>
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Top Cities</span>
                                    <p className="text-sm text-gray-700 mt-0.5">{ind.cities}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How Geobooker Helps */}
            <section className="py-20 bg-gradient-to-b from-white to-emerald-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">How Geobooker Supports Your Nearshoring Strategy</h2>
                        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                            More than a directory — your on-the-ground business intelligence tool for Mexico.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {geobookerValue.map((v, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                    {v.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{v.title}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">{v.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-12">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl transition-colors text-lg"
                        >
                            Start Searching Mexican Businesses <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* B2B CTA */}
            <section className="py-16 bg-slate-900 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <Package className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-4">Need Curated Supplier Leads?</h2>
                    <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                        Our <strong className="text-white">Geobooker Connect</strong> service delivers audited,
                        industry-specific B2B leads in Mexico. From logistics providers to industrial suppliers
                        — we help you find the right partners faster.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/b2b-connect"
                            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3 rounded-xl transition-colors flex items-center gap-2"
                        >
                            Explore B2B Connect <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/enterprise"
                            className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-3 rounded-xl transition-colors"
                        >
                            Enterprise Advertising
                        </Link>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <details key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
                                <summary className="px-6 py-4 cursor-pointer font-semibold text-gray-800 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                    {faq.q}
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-4" />
                                </summary>
                                <div className="px-6 pb-4 text-gray-600 leading-relaxed">{faq.a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-16 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Explore Mexico's Business Landscape?</h2>
                    <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
                        Whether you're scouting locations, sourcing suppliers, or setting up operations
                        — Geobooker gives you instant access to Mexico's business ecosystem.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/"
                            className="bg-white text-emerald-700 font-bold px-8 py-4 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-2"
                        >
                            Search Businesses Now <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/en/advertise-in-mexico"
                            className="border-2 border-white/30 hover:border-white/60 font-semibold px-8 py-4 rounded-xl transition-colors"
                        >
                            Advertise in Mexico
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
};

export default NearshoringMexicoPage;
