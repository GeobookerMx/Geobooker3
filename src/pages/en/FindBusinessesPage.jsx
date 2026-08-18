// src/pages/en/FindBusinessesPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import {
    Search,
    MapPin,
    Globe,
    Star,
    Zap,
    Shield,
    Smartphone,
    TrendingUp,
    CheckCircle,
    ArrowRight,
    Users,
    Building2,
    Map
} from 'lucide-react';

/**
 * Primary SEO landing page targeting "find businesses near me" / "business directory near me"
 * in international English-speaking markets (US, UK, CA, AU, etc.)
 */
const FindBusinessesPage = () => {
    const searchExamples = [
        { query: '"coffee shop near me"', category: 'Food & Drink', icon: '☕' },
        { query: '"pharmacy open now"', category: 'Healthcare', icon: '💊' },
        { query: '"mechanic near me"', category: 'Automotive', icon: '🔧' },
        { query: '"barbershop"', category: 'Beauty', icon: '💈' },
        { query: '"plumber 24hrs"', category: 'Home Services', icon: '🔨' },
        { query: '"gym near me"', category: 'Fitness', icon: '💪' },
    ];

    const features = [
        {
            icon: <Search className="w-6 h-6" />,
            title: 'Intent-Based Search',
            desc: 'Search by what you need, not just business names. Type "flat tire repair" and find the nearest vulcanizadora or tire shop instantly.'
        },
        {
            icon: <Map className="w-6 h-6" />,
            title: 'Interactive Map Discovery',
            desc: 'See every business around you on a real-time map. Filter by category, distance, rating, and opening hours.'
        },
        {
            icon: <Globe className="w-6 h-6" />,
            title: '200+ Cities Worldwide',
            desc: 'From New York to Tokyo, London to São Paulo. Geobooker covers local businesses across 25+ countries.'
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: 'AI-Optimized Results',
            desc: 'Our search engine understands natural language. Ask "where can I find good tacos?" and get real results.'
        },
        {
            icon: <Smartphone className="w-6 h-6" />,
            title: 'Mobile-First Experience',
            desc: 'Available on iOS, Android, and as a Progressive Web App. Find businesses on the go, even offline.'
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: 'Verified Listings',
            desc: 'Business owners can claim and verify their profiles. See real photos, hours, and customer reviews.'
        }
    ];

    const countries = [
        { flag: '🇺🇸', name: 'United States', cities: 'New York, LA, Houston, Miami, Chicago' },
        { flag: '🇬🇧', name: 'United Kingdom', cities: 'London, Manchester, Birmingham' },
        { flag: '🇨🇦', name: 'Canada', cities: 'Toronto, Vancouver, Montreal' },
        { flag: '🇩🇪', name: 'Germany', cities: 'Berlin, Munich, Hamburg' },
        { flag: '🇫🇷', name: 'France', cities: 'Paris, Lyon, Marseille' },
        { flag: '🇳🇱', name: 'Netherlands', cities: 'Amsterdam, Rotterdam' },
        { flag: '🇪🇸', name: 'Spain', cities: 'Madrid, Barcelona' },
        { flag: '🇮🇹', name: 'Italy', cities: 'Rome, Milan' },
        { flag: '🇯🇵', name: 'Japan', cities: 'Tokyo, Osaka' },
        { flag: '🇦🇪', name: 'UAE', cities: 'Dubai, Abu Dhabi' },
        { flag: '🇲🇽', name: 'Mexico', cities: '500,000+ businesses indexed' },
        { flag: '🇧🇷', name: 'Brazil', cities: 'São Paulo, Rio' },
    ];

    const stats = [
        { value: '500,000+', label: 'Businesses Indexed' },
        { value: '200+', label: 'Cities Worldwide' },
        { value: '25+', label: 'Countries' },
        { value: '6', label: 'Languages' },
    ];

    const faqs = [
        {
            q: 'How does Geobooker find businesses near me?',
            a: 'Geobooker combines multiple data sources including verified business listings, government business registries (like Mexico\'s DENUE database with 500,000+ entries), and Google Places to provide the most comprehensive results wherever you are in the world.'
        },
        {
            q: 'Is Geobooker free to use?',
            a: 'Yes! Searching for businesses is completely free. Business owners can also list their business for free. Premium advertising options are available for businesses that want more visibility.'
        },
        {
            q: 'What makes Geobooker different from Google Maps?',
            a: 'While Google Maps answers "where is it and how do I get there?", Geobooker answers "what business do I need near me and which option is best for me?" We focus on intent-based discovery — search for what you need in everyday language, and we match you to the right business category.'
        },
        {
            q: 'Which countries does Geobooker cover?',
            a: 'Geobooker is active in 25+ countries including the United States, United Kingdom, Canada, Germany, France, Netherlands, Spain, Italy, Japan, UAE, Mexico, Brazil, Colombia, Argentina, and more. We\'re expanding rapidly.'
        },
        {
            q: 'Can I use Geobooker while traveling in Mexico?',
            a: 'Absolutely! Geobooker is especially powerful in Mexico, where we have 500,000+ businesses indexed from official government data. Find restaurants, pharmacies, mechanic shops, and more — even in small towns.'
        },
        {
            q: 'Is there a mobile app?',
            a: 'Yes! Geobooker is available on the App Store (iOS) and Google Play (Android). You can also use it as a Progressive Web App directly from your browser.'
        }
    ];

    return (
        <>
            <SEO
                title="Find Businesses Near Me — Local Business Directory | Geobooker"
                description="Search for local businesses near you in 200+ cities worldwide. Restaurant, pharmacy, mechanic, barbershop — find what you need with Geobooker's intent-based business directory."
                type="website"
                keywords="find businesses near me, local business directory, business search, near me, local services, Geobooker"
            />

            {/* JSON-LD: WebSite + SearchAction */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebSite',
                        name: 'Geobooker',
                        url: 'https://www.geobooker.com',
                        description: 'Find local businesses near you worldwide. Intent-based business directory covering 200+ cities in 25+ countries.',
                        potentialAction: {
                            '@type': 'SearchAction',
                            target: {
                                '@type': 'EntryPoint',
                                urlTemplate: 'https://www.geobooker.com/?q={search_term_string}'
                            },
                            'query-input': 'required name=search_term_string'
                        },
                        inLanguage: ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'],
                        publisher: {
                            '@type': 'Organization',
                            name: 'Geobooker',
                            url: 'https://www.geobooker.com'
                        }
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
                            acceptedAnswer: {
                                '@type': 'Answer',
                                text: faq.a
                            }
                        }))
                    })
                }}
            />

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] opacity-10" />
                <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <Globe className="w-4 h-4" />
                        Available in 25+ Countries
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                        Find Local Businesses
                        <span className="block text-sky-200">Near You, Anywhere</span>
                    </h1>
                    <p className="text-xl sm:text-2xl text-sky-100 max-w-3xl mx-auto mb-10">
                        The global business directory that understands what you need.
                        Search by intent, discover on a map, connect with local businesses in 200+ cities worldwide.
                    </p>

                    {/* Search Bar CTA */}
                    <div className="max-w-2xl mx-auto">
                        <Link
                            to="/"
                            className="flex items-center bg-white rounded-xl shadow-2xl px-6 py-4 text-left hover:shadow-3xl transition-shadow"
                        >
                            <Search className="w-6 h-6 text-gray-400 flex-shrink-0" />
                            <span className="ml-4 text-gray-500 text-lg">Search for restaurants, pharmacies, mechanics...</span>
                            <ArrowRight className="w-5 h-5 text-sky-600 ml-auto flex-shrink-0" />
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-14 max-w-4xl mx-auto">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl font-bold">{stat.value}</div>
                                <div className="text-sky-200 text-sm mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Search Examples */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4">Search the Way You Think</h2>
                    <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
                        Forget exact names. Just type what you need in everyday language.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {searchExamples.map((ex, i) => (
                            <Link
                                key={i}
                                to={`/?q=${encodeURIComponent(ex.query.replace(/"/g, ''))}`}
                                className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                            >
                                <div className="text-3xl mb-2">{ex.icon}</div>
                                <div className="text-sm font-semibold text-gray-800">{ex.query}</div>
                                <div className="text-xs text-gray-500 mt-1">{ex.category}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4">Why Choose Geobooker?</h2>
                    <p className="text-gray-600 text-center max-w-2xl mx-auto mb-14">
                        More than just a map. A complete local business discovery platform.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feat, i) => (
                            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center mb-4">
                                    {feat.icon}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Countries Coverage */}
            <section className="py-20 bg-gradient-to-b from-white to-sky-50">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4">Available Worldwide</h2>
                    <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
                        Local results, global reach. Geobooker is active and growing across these markets.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {countries.map((c, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                                <div className="text-2xl mb-1">{c.flag}</div>
                                <div className="font-semibold text-gray-800">{c.name}</div>
                                <div className="text-xs text-gray-500 mt-1">{c.cities}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* For Business Owners CTA */}
            <section className="py-16 bg-slate-900 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <Building2 className="w-12 h-12 text-sky-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-4">Own a Business?</h2>
                    <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                        List your business for free and get discovered by customers who are actively searching for what you offer.
                        Premium advertising options available for more visibility.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/business/register"
                            className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 py-3 rounded-xl transition-colors flex items-center gap-2"
                        >
                            List Your Business Free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/en/advertise-in-mexico"
                            className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-3 rounded-xl transition-colors"
                        >
                            Advertise with Us
                        </Link>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <details
                                key={i}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden group"
                            >
                                <summary className="px-6 py-4 cursor-pointer font-semibold text-gray-800 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                    {faq.q}
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-4" />
                                </summary>
                                <div className="px-6 pb-4 text-gray-600 leading-relaxed">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Download CTA */}
            <section className="py-16 bg-gradient-to-r from-sky-600 to-blue-700 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <Smartphone className="w-10 h-10 mx-auto mb-4 text-sky-200" />
                    <h2 className="text-3xl font-bold mb-4">Get the App</h2>
                    <p className="text-sky-100 text-lg mb-8">
                        Download Geobooker on your phone and never miss a great local business again.
                    </p>
                    <Link
                        to="/download"
                        className="inline-flex items-center gap-2 bg-white text-sky-700 font-bold px-8 py-3 rounded-xl hover:bg-sky-50 transition-colors"
                    >
                        Download Now <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>
        </>
    );
};

export default FindBusinessesPage;
