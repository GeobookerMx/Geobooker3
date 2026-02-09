// src/pages/cities/CityLandingPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import { Search, MapPin, Star, ArrowRight, Building2 } from 'lucide-react';

/**
 * Landing Page para ciudades internacionales
 * Optimizado para SEO en USA, UK, Canadá
 */

// Configuración de ciudades por país
const CITIES_CONFIG = {
    // USA
    'los-angeles': {
        name: 'Los Angeles',
        state: 'California',
        country: 'US',
        population: '4M+',
        lang: 'en',
        popularCategories: ['taco_shop', 'coffee_shop', 'gym', 'barbershop', 'auto_repair'],
        heroImage: '/images/cities/los-angeles.jpg',
        description: 'Find the best local businesses in Los Angeles, California. From tacos to tech, discover what LA has to offer.',
        descriptionEs: 'Encuentra los mejores negocios locales en Los Angeles, California. Desde tacos hasta tecnología.'
    },
    'new-york': {
        name: 'New York',
        state: 'New York',
        country: 'US',
        population: '8.3M+',
        lang: 'en',
        popularCategories: ['pizza', 'coffee_shop', 'deli', 'barbershop', 'pharmacy'],
        heroImage: '/images/cities/new-york.jpg',
        description: 'Discover NYC\'s vibrant business scene. From Manhattan delis to Brooklyn barbershops.',
        descriptionEs: 'Descubre la vibrante escena de negocios de NYC. Desde delis de Manhattan hasta barberías de Brooklyn.'
    },
    'houston': {
        name: 'Houston',
        state: 'Texas',
        country: 'US',
        population: '2.3M+',
        lang: 'en',
        popularCategories: ['taco_shop', 'bbq', 'auto_repair', 'gas_station', 'pharmacy'],
        heroImage: '/images/cities/houston.jpg',
        description: 'Houston\'s best local businesses at your fingertips. BBQ, tacos, and more.',
        descriptionEs: 'Los mejores negocios locales de Houston a tu alcance. BBQ, tacos y más.'
    },
    'miami': {
        name: 'Miami',
        state: 'Florida',
        country: 'US',
        population: '450K+',
        lang: 'en',
        popularCategories: ['cuban_restaurant', 'coffee_shop', 'nail_salon', 'gym', 'pharmacy'],
        heroImage: '/images/cities/miami.jpg',
        description: 'Miami\'s hottest local spots. Cuban coffee, beach vibes, and everything in between.',
        descriptionEs: 'Los mejores lugares locales de Miami. Café cubano, playa y todo lo demás.'
    },
    // UK
    'london': {
        name: 'London',
        state: 'England',
        country: 'GB',
        population: '9M+',
        lang: 'en',
        popularCategories: ['chippy', 'chemist', 'takeaway', 'estate_agent', 'newsagent'],
        heroImage: '/images/cities/london.jpg',
        description: 'Discover London\'s finest local businesses. From chippies to chemists, find what you need.',
        descriptionEs: 'Descubre los mejores negocios locales de Londres.'
    },
    'manchester': {
        name: 'Manchester',
        state: 'England',
        country: 'GB',
        population: '550K+',
        lang: 'en',
        popularCategories: ['chippy', 'takeaway', 'chemist', 'surgery', 'barbershop'],
        heroImage: '/images/cities/manchester.jpg',
        description: 'Manchester\'s top local businesses. Northern hospitality at its finest.',
        descriptionEs: 'Los mejores negocios locales de Manchester.'
    },
    // Canada
    'toronto': {
        name: 'Toronto',
        state: 'Ontario',
        country: 'CA',
        population: '2.9M+',
        lang: 'en',
        popularCategories: ['poutine', 'coffee_shop', 'dispensary', 'barbershop', 'pizza'],
        heroImage: '/images/cities/toronto.jpg',
        description: 'Toronto\'s diverse local business scene. Poutine, coffee, and multicultural flavors.',
        descriptionEs: 'La diversa escena de negocios de Toronto. Poutine, café y sabores multiculturales.'
    },
    'vancouver': {
        name: 'Vancouver',
        state: 'British Columbia',
        country: 'CA',
        population: '675K+',
        lang: 'en',
        popularCategories: ['sushi', 'coffee_shop', 'dispensary', 'yoga_studio', 'organic_store'],
        heroImage: '/images/cities/vancouver.jpg',
        description: 'Vancouver\'s best local businesses. Sushi, nature, and West Coast vibes.',
        descriptionEs: 'Los mejores negocios locales de Vancouver. Sushi, naturaleza y vibraciones de la Costa Oeste.'
    }
};

export default function CityLandingPage() {
    const { citySlug } = useParams();
    const { t, i18n } = useTranslation();
    const [city, setCity] = useState(null);

    useEffect(() => {
        const cityConfig = CITIES_CONFIG[citySlug];
        if (cityConfig) {
            setCity(cityConfig);
        }
    }, [citySlug]);

    if (!city) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-700">City not found</h1>
                    <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    const isSpanish = i18n.language === 'es';
    const description = isSpanish && city.descriptionEs ? city.descriptionEs : city.description;
    const countryLabels = { US: 'United States', GB: 'United Kingdom', CA: 'Canada' };

    return (
        <>
            <SEO
                title={`${city.name} Local Businesses | Geobooker`}
                description={description}
                url={`https://geobooker.com/cities/${citySlug}`}
            />

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white py-20">
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <MapPin className="w-5 h-5" />
                            <span className="text-sm opacity-90">{city.state}, {countryLabels[city.country]}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            {isSpanish ? 'Negocios en' : 'Businesses in'} {city.name}
                        </h1>
                        <p className="text-xl opacity-90 mb-8">
                            {description}
                        </p>

                        {/* Search Bar */}
                        <div className="bg-white rounded-xl p-2 shadow-2xl flex items-center max-w-xl mx-auto">
                            <Search className="w-5 h-5 text-gray-400 ml-3" />
                            <input
                                type="text"
                                placeholder={isSpanish ? `Buscar negocios en ${city.name}...` : `Search businesses in ${city.name}...`}
                                className="flex-1 px-4 py-3 text-gray-800 focus:outline-none"
                            />
                            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                {isSpanish ? 'Buscar' : 'Search'}
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-center gap-8 mt-8">
                            <div>
                                <div className="text-2xl font-bold">{city.population}</div>
                                <div className="text-sm opacity-75">{isSpanish ? 'Población' : 'Population'}</div>
                            </div>
                            <div className="w-px h-10 bg-white/30"></div>
                            <div>
                                <div className="text-2xl font-bold flex items-center gap-1">
                                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    4.8
                                </div>
                                <div className="text-sm opacity-75">{isSpanish ? 'Calificación' : 'Rating'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Popular Categories */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
                        {isSpanish ? `Categorías Populares en ${city.name}` : `Popular Categories in ${city.name}`}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
                        {city.popularCategories.map((cat, index) => (
                            <Link
                                key={cat}
                                to={`/search?q=${cat}&city=${citySlug}`}
                                className="bg-white rounded-xl p-4 text-center shadow-md hover:shadow-lg transition-shadow border border-gray-100 hover:border-blue-200"
                            >
                                <Building2 className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                    {t(`internationalCategories.${city.country === 'GB' ? 'uk' : city.country === 'CA' ? 'canada' : 'usa'}.${cat}`, cat.replace(/_/g, ' '))}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        {isSpanish ? '¿Tienes un negocio?' : 'Own a business?'}
                    </h2>
                    <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                        {isSpanish
                            ? 'Registra tu negocio gratis y alcanza miles de clientes en tu área.'
                            : 'List your business for free and reach thousands of customers in your area.'
                        }
                    </p>
                    <Link
                        to="/business/register"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                        {isSpanish ? 'Registrar Negocio' : 'List Your Business'}
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Other Cities */}
            <section className="py-16 bg-gray-100">
                <div className="container mx-auto px-4">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
                        {isSpanish ? 'Explorar Otras Ciudades' : 'Explore Other Cities'}
                    </h2>
                    <div className="flex flex-wrap justify-center gap-3">
                        {Object.entries(CITIES_CONFIG)
                            .filter(([slug]) => slug !== citySlug)
                            .map(([slug, c]) => (
                                <Link
                                    key={slug}
                                    to={`/cities/${slug}`}
                                    className="bg-white px-4 py-2 rounded-full text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-gray-200"
                                >
                                    {c.name}
                                </Link>
                            ))
                        }
                    </div>
                </div>
            </section>
        </>
    );
}
