// src/pages/en/MexicoBusinessDirectoryPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import {
    MapPin, Search, Globe, Plane, Building2, Star,
    ArrowRight, Utensils, Heart, Car, Stethoscope,
    ShoppingBag, Wrench, CheckCircle, Smartphone
} from 'lucide-react';

/**
 * SEO landing page for tourists, expats, and travelers searching for businesses in Mexico.
 * Targets: "Mexico business directory", "find businesses in Mexico", "Mexico travel services"
 */
const MexicoBusinessDirectoryPage = () => {
    const topCities = [
        { name: 'Mexico City (CDMX)', businesses: '120,000+', slug: 'ciudad-de-mexico', highlights: 'Capital city, street food, museums, business HQ' },
        { name: 'Guadalajara', businesses: '45,000+', slug: 'guadalajara', highlights: 'Tech hub, tequila, mariachi, crafts' },
        { name: 'Monterrey', businesses: '55,000+', slug: 'monterrey', highlights: 'Industry capital, mountains, craft beer' },
        { name: 'Cancún', businesses: '15,000+', slug: 'cancun', highlights: 'Tourism, beaches, nightlife, diving' },
        { name: 'Puebla', businesses: '30,000+', slug: 'puebla', highlights: 'Colonial architecture, mole, VW factory' },
        { name: 'Mérida', businesses: '20,000+', slug: 'merida', highlights: 'Safest city, Mayan culture, cenotes' },
        { name: 'Tijuana', businesses: '25,000+', slug: 'tijuana', highlights: 'Border city, medical tourism, street tacos' },
        { name: 'Playa del Carmen', businesses: '8,000+', slug: 'playa-del-carmen', highlights: 'Expat community, beaches, digital nomads' },
    ];

    const categories = [
        { icon: <Utensils className="w-5 h-5" />, name: 'Restaurants & Food', examples: 'Taquerías, cafés, bakeries, street food' },
        { icon: <Stethoscope className="w-5 h-5" />, name: 'Healthcare', examples: 'Pharmacies, clinics, dentists, hospitals' },
        { icon: <Car className="w-5 h-5" />, name: 'Automotive', examples: 'Mechanics, tire shops, gas stations, car wash' },
        { icon: <Heart className="w-5 h-5" />, name: 'Beauty & Wellness', examples: 'Salons, spas, barbershops, gyms' },
        { icon: <ShoppingBag className="w-5 h-5" />, name: 'Shopping & Retail', examples: 'Markets, malls, convenience stores' },
        { icon: <Wrench className="w-5 h-5" />, name: 'Home Services', examples: 'Plumbers, electricians, locksmiths, cleaning' },
    ];

    const useCases = [
        { emoji: '🏖️', title: 'Tourists', desc: 'Find restaurants, pharmacies, ATMs, and local experiences in any Mexican city.' },
        { emoji: '🏡', title: 'Expats & Digital Nomads', desc: 'Discover local services — from veterinarians to coworking spaces — in your new city.' },
        { emoji: '💼', title: 'Business Travelers', desc: 'Locate meeting venues, transport services, and nearby restaurants for client dinners.' },
        { emoji: '🏥', title: 'Medical Tourists', desc: 'Find dentists, clinics, and pharmacies in border cities like Tijuana and Los Algodones.' },
    ];

    const faqs = [
        {
            q: 'How many businesses are listed in Mexico on Geobooker?',
            a: 'Geobooker indexes over 500,000 businesses across Mexico, sourced from the official DENUE/INEGI government database. This includes everything from small taquerías to large factories, pharmacies, clinics, and service providers in cities of all sizes.'
        },
        {
            q: 'Can I search for businesses in Mexico in English?',
            a: 'Yes! Geobooker supports English, Spanish, French, Chinese, Japanese, and Korean. You can search in English (e.g., "pharmacy near me") and our intent-based engine will match you to the right Mexican business category.'
        },
        {
            q: 'Is Geobooker useful in small Mexican towns?',
            a: 'Absolutely. Because we use Mexico\'s official government business registry (DENUE), we have listings for businesses in even the smallest towns — not just major cities. If a business is registered in Mexico, there\'s a good chance it\'s on Geobooker.'
        },
        {
            q: 'How do I find a doctor or pharmacy in Mexico?',
            a: 'Simply search "pharmacy" or "doctor" on Geobooker and you\'ll see results near your location. We show address, phone number, and opening hours so you can quickly find what you need. Many pharmacies in Mexico are open 24 hours.'
        }
    ];

    return (
        <>
            <SEO
                title="Mexico Business Directory — Find Restaurants, Services & More | Geobooker"
                description="Complete business directory for Mexico with 500,000+ listings. Find restaurants, pharmacies, mechanics, doctors, and local services in CDMX, Cancún, Guadalajara, and every Mexican city."
                type="website"
                keywords="Mexico business directory, find businesses in Mexico, Mexico services, Mexico travel guide, Mexico restaurants, Mexico pharmacy, expat Mexico"
            />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'CollectionPage',
                        name: 'Mexico Business Directory',
                        description: 'Complete directory of 500,000+ businesses across Mexico',
                        url: 'https://www.geobooker.com/en/mexico-business-directory',
                        publisher: { '@type': 'Organization', name: 'Geobooker' },
                        about: { '@type': 'Country', name: 'Mexico' },
                        numberOfItems: 500000
                    })
                }}
            />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faqs.map(f => ({
                            '@type': 'Question', name: f.q,
                            acceptedAnswer: { '@type': 'Answer', text: f.a }
                        }))
                    })
                }}
            />

            {/* Hero */}
            <section className="relative bg-gradient-to-br from-orange-500 via-red-600 to-pink-700 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] opacity-10" />
                <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                        🇲🇽 500,000+ Businesses Indexed
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                        Mexico Business Directory
                    </h1>
                    <p className="text-xl sm:text-2xl text-orange-100 max-w-3xl mx-auto mb-10">
                        The most comprehensive local business directory for Mexico.
                        Find restaurants, pharmacies, doctors, mechanics, and local services
                        in every city — from CDMX to Cancún.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-3 bg-white text-red-700 font-bold px-8 py-4 rounded-xl text-lg hover:bg-orange-50 transition-colors"
                    >
                        <Search className="w-5 h-5" /> Search Mexico Now
                    </Link>
                </div>
            </section>

            {/* Who It's For */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-5xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">Perfect For</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {useCases.map((uc, i) => (
                            <div key={i} className="bg-white rounded-xl p-6 text-center border border-gray-100 shadow-sm">
                                <div className="text-4xl mb-3">{uc.emoji}</div>
                                <h3 className="font-bold text-lg mb-2">{uc.title}</h3>
                                <p className="text-gray-600 text-sm">{uc.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4">Popular Categories</h2>
                    <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
                        Whatever you need in Mexico, Geobooker helps you find it.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat, i) => (
                            <Link key={i} to={`/?q=${encodeURIComponent(cat.name)}`} className="flex items-start gap-4 bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {cat.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold">{cat.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{cat.examples}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Top Cities */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4">Top Cities in Mexico</h2>
                    <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
                        Explore local businesses in Mexico's most popular destinations.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {topCities.map((city, i) => (
                            <Link
                                key={i}
                                to={`/ciudad/${city.slug}`}
                                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <h3 className="font-bold text-gray-800">{city.name}</h3>
                                <p className="text-sm text-red-600 font-semibold mt-1">{city.businesses} businesses</p>
                                <p className="text-xs text-gray-500 mt-2">{city.highlights}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20">
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

            {/* Download CTA */}
            <section className="py-16 bg-gradient-to-r from-red-600 to-orange-600 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <Smartphone className="w-10 h-10 mx-auto mb-4 text-orange-200" />
                    <h2 className="text-3xl font-bold mb-4">Traveling to Mexico?</h2>
                    <p className="text-orange-100 text-lg mb-8">
                        Download Geobooker before your trip. Works offline too.
                    </p>
                    <Link
                        to="/download"
                        className="inline-flex items-center gap-2 bg-white text-red-700 font-bold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors"
                    >
                        Get the App <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>
        </>
    );
};

export default MexicoBusinessDirectoryPage;
