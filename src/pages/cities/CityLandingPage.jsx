// src/pages/cities/CityLandingPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import { Search, MapPin, ArrowRight, Building2 } from 'lucide-react';
import publicGlobalMarkets from '../../config/publicGlobalMarkets.json';

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
    },
    // Spain
    'madrid': {
        name: 'Madrid',
        state: 'Comunidad de Madrid',
        country: 'ES',
        population: '3.4M+',
        lang: 'es',
        popularCategories: ['restaurant', 'coffee_shop', 'bakery', 'beauty_salon', 'professional_service'],
        heroImage: '/images/cities/madrid.jpg',
        description: 'Discover local businesses, food and professional services in Madrid.',
        descriptionEs: 'Descubre negocios, restaurantes y servicios profesionales en Madrid.'
    },
    'barcelona': {
        name: 'Barcelona',
        state: 'Cataluna',
        country: 'ES',
        population: '1.7M+',
        lang: 'es',
        popularCategories: ['restaurant', 'hotel', 'professional_service', 'shopping', 'transport'],
        heroImage: '/images/cities/barcelona.jpg',
        description: 'Discover local commerce, services and visitor businesses in Barcelona.',
        descriptionEs: 'Descubre comercio local, servicios y negocios para visitantes en Barcelona.'
    },
    'bogota': {
        name: 'Bogotá',
        state: 'Distrito Capital',
        country: 'CO',
        population: '7.9M+',
        lang: 'es',
        popularCategories: ['restaurant', 'transport', 'hotel', 'professional_service', 'shopping'],
        heroImage: '/images/cities/bogota.jpg',
        description: 'Discover local businesses, logistics and professional services in Bogota.',
        descriptionEs: 'Descubre negocios locales, logística y servicios profesionales en Bogotá.'
    },
    'amsterdam': {
        name: 'Amsterdam',
        state: 'North Holland',
        country: 'NL',
        population: '900K+',
        lang: 'nl',
        popularCategories: ['cafe', 'restaurant', 'bike_shop', 'hotel', 'professional_service'],
        heroImage: '/images/cities/amsterdam.jpg',
        description: 'Discover local businesses, cafes, and bike services in Amsterdam.',
        descriptionEs: 'Descubre negocios locales, cafeterías y servicios en Amsterdam.'
    },
    'rome': {
        name: 'Rome',
        state: 'Lazio',
        country: 'IT',
        population: '2.8M+',
        lang: 'it',
        popularCategories: ['trattoria', 'gelateria', 'hotel', 'coffee_shop', 'shopping'],
        heroImage: '/images/cities/rome.jpg',
        description: 'Discover historical local businesses, trattorias, and artisan shops in Rome.',
        descriptionEs: 'Descubre negocios locales históricos, trattorias y tiendas artesanales en Roma.'
    },
    'milan': {
        name: 'Milan',
        state: 'Lombardy',
        country: 'IT',
        population: '1.4M+',
        lang: 'it',
        popularCategories: ['fashion', 'restaurant', 'hotel', 'professional_service', 'cafe'],
        heroImage: '/images/cities/milan.jpg',
        description: 'Discover business services, fashion, and dining in Milan.',
        descriptionEs: 'Descubre servicios comerciales, moda y gastronomía en Milán.'
    },
    'paris': {
        name: 'Paris',
        state: 'Île-de-France',
        country: 'FR',
        population: '2.1M+',
        lang: 'fr',
        popularCategories: ['bistro', 'bakery', 'hotel', 'fashion', 'cafe'],
        heroImage: '/images/cities/paris.jpg',
        description: 'Discover local shops, bakeries, and services in Paris.',
        descriptionEs: 'Descubre tiendas locales, panaderías y servicios en París.'
    },
    'berlin': {
        name: 'Berlin',
        state: 'Berlin',
        country: 'DE',
        population: '3.6M+',
        lang: 'de',
        popularCategories: ['cafe', 'bar', 'tech_hub', 'hotel', 'restaurant'],
        heroImage: '/images/cities/berlin.jpg',
        description: 'Discover creative hubs, cafes, and local businesses in Berlin.',
        descriptionEs: 'Descubre centros creativos, cafeterías y negocios locales en Berlín.'
    },
    'lisbon': {
        name: 'Lisbon',
        state: 'Lisbon',
        country: 'PT',
        population: '540K+',
        lang: 'pt',
        popularCategories: ['pastry_shop', 'restaurant', 'hotel', 'surf_shop', 'cafe'],
        heroImage: '/images/cities/lisbon.jpg',
        description: 'Discover coastal businesses, cafes, and local services in Lisbon.',
        descriptionEs: 'Descubre negocios costeros, cafeterías y servicios locales en Lisboa.'
    },
    'sao-paulo': {
        name: 'São Paulo',
        state: 'São Paulo',
        country: 'BR',
        population: '12.3M+',
        lang: 'pt',
        popularCategories: ['restaurant', 'hotel', 'hospital', 'bookstore', 'cafe'],
        heroImage: '/images/cities/sao-paulo.jpg',
        description: 'Discover gastronomy, commercial hubs, and services in São Paulo.',
        descriptionEs: 'Descubre gastronomía, centros comerciales y servicios en São Paulo.'
    },
    'mexico-city': {
        name: 'Mexico City',
        state: 'CDMX',
        country: 'MX',
        population: '9.2M+',
        lang: 'es',
        popularCategories: ['restaurant', 'museum', 'hotel', 'bookstore', 'bakery'],
        heroImage: '/images/cities/mexico-city.jpg',
        description: 'Discover culture, food, and local business profiles in Mexico City.',
        descriptionEs: 'Descubre cultura, gastronomía y perfiles de negocios locales en la Ciudad de México.'
    },
    'buenos-aires': {
        name: 'Buenos Aires',
        state: 'CABA',
        country: 'AR',
        population: '3M+',
        lang: 'es',
        popularCategories: ['restaurant', 'cafe', 'bookstore', 'hotel', 'professional_service'],
        heroImage: '/images/cities/buenos-aires.jpg',
        description: 'Discover cafes, bookshops, and local businesses in Buenos Aires.',
        descriptionEs: 'Descubre cafés, librerías y negocios locales en Buenos Aires.'
    },
    'santiago': {
        name: 'Santiago',
        state: 'Región Metropolitana',
        country: 'CL',
        population: '5.6M+',
        lang: 'es',
        popularCategories: ['restaurant', 'hotel', 'shopping', 'transport', 'cafe'],
        heroImage: '/images/cities/santiago.jpg',
        description: 'Discover commerce, dining, and local services in Santiago.',
        descriptionEs: 'Descubre comercio, gastronomía y servicios locales en Santiago.'
    },
    'lima': {
        name: 'Lima',
        state: 'Lima',
        country: 'PE',
        population: '9.7M+',
        lang: 'es',
        popularCategories: ['cevichería', 'restaurant', 'hotel', 'shopping', 'cafe'],
        heroImage: '/images/cities/lima.jpg',
        description: 'Discover culinary spots, tourism, and local business services in Lima.',
        descriptionEs: 'Descubre gastronomía, turismo y servicios comerciales en Lima.'
    },
    'singapore': {
        name: 'Singapore',
        state: 'Singapore',
        country: 'SG',
        population: '5.9M+',
        lang: 'en',
        popularCategories: ['restaurant', 'professional_service', 'shopping', 'health_care', 'logistics'],
        heroImage: '/images/cities/singapore.jpg',
        description: 'Discover trusted restaurants, professional services, shops, and logistics providers in Singapore.',
        descriptionEs: 'Descubre restaurantes, servicios profesionales, tiendas y proveedores logísticos en Singapur.'
    },
    'seoul': {
        name: 'Seoul',
        state: 'Seoul Capital Area',
        country: 'KR',
        population: '9.3M+',
        lang: 'ko',
        popularCategories: ['restaurant', 'beauty_salon', 'shopping', 'health_care', 'technology'],
        heroImage: '/images/cities/seoul.jpg',
        description: 'Discover restaurants, beauty services, technology providers, and local shops in Seoul.',
        descriptionEs: 'Descubre restaurantes, servicios de belleza, tecnología y comercios locales en Seúl.'
    },
    'dubai': {
        name: 'Dubai',
        state: 'Dubai',
        country: 'AE',
        population: '3.8M+',
        lang: 'en',
        popularCategories: ['restaurant', 'hotel', 'real_estate', 'professional_service', 'logistics'],
        heroImage: '/images/cities/dubai.jpg',
        description: 'Discover hospitality, real estate, professional services, and logistics businesses in Dubai.',
        descriptionEs: 'Descubre hotelería, bienes raíces, servicios profesionales y logística en Dubái.'
    },
    'stockholm': {
        name: 'Stockholm',
        state: 'Stockholm County',
        country: 'SE',
        population: '1M+',
        lang: 'sv',
        popularCategories: ['restaurant', 'cafe', 'technology', 'professional_service', 'shopping'],
        heroImage: '/images/cities/stockholm.jpg',
        description: 'Discover restaurants, technology companies, professional services, and local shops in Stockholm.',
        descriptionEs: 'Descubre restaurantes, empresas tecnológicas, servicios profesionales y comercios en Estocolmo.'
    },
    'vienna': {
        name: 'Vienna',
        state: 'Vienna',
        country: 'AT',
        population: '2M+',
        lang: 'de',
        popularCategories: ['restaurant', 'cafe', 'hotel', 'health_care', 'professional_service'],
        heroImage: '/images/cities/vienna.jpg',
        description: 'Discover restaurants, hotels, health providers, and professional services in Vienna.',
        descriptionEs: 'Descubre restaurantes, hoteles, servicios de salud y profesionales en Viena.'
    },
    'brussels': {
        name: 'Brussels',
        state: 'Brussels-Capital',
        country: 'BE',
        population: '1.2M+',
        lang: 'fr',
        popularCategories: ['restaurant', 'cafe', 'professional_service', 'hotel', 'shopping'],
        heroImage: '/images/cities/brussels.jpg',
        description: 'Discover restaurants, professional services, hotels, and local shops in Brussels.',
        descriptionEs: 'Descubre restaurantes, servicios profesionales, hoteles y comercios en Bruselas.'
    },
    'tokyo': {
        name: 'Tokyo',
        state: 'Tokyo Metropolis',
        country: 'JP',
        population: '14M+',
        lang: 'ja',
        popularCategories: ['restaurant', 'shopping', 'technology', 'hotel', 'professional_service'],
        heroImage: '/images/cities/tokyo.jpg',
        description: 'Discover restaurants, technology providers, shops, and professional services in Tokyo.',
        descriptionEs: 'Descubre restaurantes, tecnología, comercios y servicios profesionales en Tokio.'
    },
    'sydney': {
        name: 'Sydney',
        state: 'New South Wales',
        country: 'AU',
        population: '5.3M+',
        lang: 'en',
        popularCategories: ['restaurant', 'cafe', 'professional_service', 'health_care', 'real_estate'],
        heroImage: '/images/cities/sydney.jpg',
        description: 'Discover restaurants, health providers, professional services, and local businesses in Sydney.',
        descriptionEs: 'Descubre restaurantes, servicios de salud, profesionales y negocios locales en Sídney.'
    },
    'dublin': {
        name: 'Dublin',
        state: 'Leinster',
        country: 'IE',
        population: '1.3M+',
        lang: 'en',
        popularCategories: ['restaurant', 'pub', 'technology', 'professional_service', 'hotel'],
        heroImage: '/images/cities/dublin.jpg',
        description: 'Discover restaurants, technology companies, professional services, and hospitality in Dublin.',
        descriptionEs: 'Descubre restaurantes, tecnología, servicios profesionales y hotelería en Dublín.'
    },
    'zurich': {
        name: 'Zurich',
        state: 'Zurich',
        country: 'CH',
        population: '440K+',
        lang: 'de',
        popularCategories: ['finance', 'restaurant', 'professional_service', 'health_care', 'hotel'],
        heroImage: '/images/cities/zurich.jpg',
        description: 'Discover financial, professional, health, hospitality, and local services in Zurich.',
        descriptionEs: 'Descubre servicios financieros, profesionales, de salud y hotelería en Zúrich.'
    },
    'medellin': {
        name: 'Medellín',
        state: 'Antioquia',
        country: 'CO',
        population: '2.6M+',
        lang: 'es',
        popularCategories: ['restaurant', 'technology', 'professional_service', 'health_care', 'shopping'],
        heroImage: '/images/cities/medellin.jpg',
        description: 'Discover technology, professional services, restaurants, and local commerce in Medellin.',
        descriptionEs: 'Descubre tecnología, servicios profesionales, restaurantes y comercio local en Medellín.'
    }
};

const marketSlug = (market) => String(market.id || '').replace(/^[a-z]{2}-/, '');
const MARKET_BY_SLUG = new Map(
    publicGlobalMarkets.markets.map((market) => [marketSlug(market), market])
);
const INDEXABLE_CITY_SLUGS = new Set(
    publicGlobalMarkets.markets
        .filter((market) => market.status === 'active' && Number(market.currentRecords) > 0)
        .map(marketSlug)
);

export default function CityLandingPage() {
    const { citySlug } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [city, setCity] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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
    const market = MARKET_BY_SLUG.get(citySlug);
    const isIndexable = INDEXABLE_CITY_SLUGS.has(citySlug);
    const recordsAvailable = Number(market?.currentRecords || 0);
    const countryLabels = {
        US: 'United States', GB: 'United Kingdom', CA: 'Canada', ES: 'España',
        NL: 'Netherlands', IT: 'Italia', FR: 'France', DE: 'Deutschland',
        PT: 'Portugal', BR: 'Brasil', MX: 'México', CO: 'Colombia',
        AR: 'Argentina', CL: 'Chile', PE: 'Perú', SG: 'Singapore',
        KR: 'South Korea', AE: 'United Arab Emirates', SE: 'Sweden',
        AT: 'Austria', BE: 'Belgium', JP: 'Japan', AU: 'Australia',
        IE: 'Ireland', CH: 'Switzerland'
    };
    const cityUrl = `https://www.geobooker.com/cities/${citySlug}`;
    const handleSearch = (event) => {
        event.preventDefault();
        if (!isIndexable) return;
        if (searchQuery.trim()) {
            const params = new URLSearchParams({ category: searchQuery.trim() });
            navigate(`/ciudad/${citySlug}?${params.toString()}`);
            return;
        }
        navigate(`/ciudad/${citySlug}`);
    };
    const cityStructuredData = [
        {
            "@context": "https://schema.org",
            "@type": "Place",
            name: city.name,
            address: {
                "@type": "PostalAddress",
                addressLocality: city.name,
                addressRegion: city.state,
                addressCountry: city.country
            },
            url: cityUrl,
            description
        },
        {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: isSpanish ? `Categorias populares en ${city.name}` : `Popular categories in ${city.name}`,
            itemListElement: city.popularCategories.map((category, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: category.replace(/_/g, ' '),
                url: `${window.location.origin}/ciudad/${encodeURIComponent(citySlug)}?category=${encodeURIComponent(category)}`
            }))
        }
    ];

    return (
        <>
            <SEO
                title={isSpanish ? `${city.name}: negocios, servicios y comida local` : `${city.name} local businesses, food and services`}
                description={description}
                url={cityUrl}
                breadcrumbs={[
                    { name: isSpanish ? 'Inicio' : 'Home', item: '/' },
                    { name: isSpanish ? 'Ciudades' : 'Cities', item: '/cities' },
                    { name: city.name, item: `/cities/${citySlug}` }
                ]}
                structuredData={isIndexable ? cityStructuredData : null}
                noindex={!isIndexable}
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
                        <form onSubmit={handleSearch} className="bg-white rounded-xl p-2 shadow-2xl flex items-center max-w-xl mx-auto">
                            <Search className="w-5 h-5 text-gray-400 ml-3" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                disabled={!isIndexable}
                                placeholder={isIndexable
                                    ? (isSpanish ? `Buscar negocios en ${city.name}...` : `Search businesses in ${city.name}...`)
                                    : (isSpanish ? 'Mercado aún no disponible' : 'Market not available yet')}
                                className="flex-1 px-4 py-3 text-gray-800 focus:outline-none disabled:bg-gray-100"
                            />
                            <button disabled={!isIndexable} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {isIndexable ? (isSpanish ? 'Buscar' : 'Search') : (isSpanish ? 'Próximamente' : 'Coming soon')}
                            </button>
                        </form>

                        {/* Stats */}
                        <div className="flex items-center justify-center gap-8 mt-8">
                            <div>
                                <div className="text-2xl font-bold">{city.population}</div>
                                <div className="text-sm opacity-75">{isSpanish ? 'Población' : 'Population'}</div>
                            </div>
                            <div className="w-px h-10 bg-white/30"></div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {recordsAvailable > 0 ? recordsAvailable.toLocaleString() : (isSpanish ? 'Próximamente' : 'Coming soon')}
                                </div>
                                <div className="text-sm opacity-75">
                                    {recordsAvailable > 0
                                        ? (isSpanish ? 'Perfiles disponibles' : 'Available listings')
                                        : (isSpanish ? 'Sin publicación activa' : 'No active publication')}
                                </div>
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
                        {isIndexable && city.popularCategories.map((cat) => (
                            <Link
                                key={cat}
                                to={`/ciudad/${citySlug}/${encodeURIComponent(cat)}`}
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
                            .filter(([slug]) => slug !== citySlug && INDEXABLE_CITY_SLUGS.has(slug))
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
