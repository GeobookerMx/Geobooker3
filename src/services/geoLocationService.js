// src/services/geoLocationService.js
/**
 * Servicio para detectar la ubicación geográfica del usuario (país/ciudad)
 * Usado para SEO dinámico y optimizaciones regionales
 */

/**
 * Detecta el país del usuario basado en su IP
 * Usa ipapi.co (gratis, 1000 requests/día)
 * 
 * @returns {Promise<Object>} {country, countryName, city, region, latitude, longitude}
 */
export const detectUserCountry = async () => {
    try {
        // Intentar cargar desde caché primero (válido por 24h)
        const cached = localStorage.getItem('geo_country_cache');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const ONE_DAY = 24 * 60 * 60 * 1000;
            if (Date.now() - timestamp < ONE_DAY) {
                console.log('✅ País detectado desde caché:', data.country);
                return data;
            }
        }

        // Llamar a API de geolocalización
        console.log('🌍 Detectando país del usuario...');
        const response = await fetch('https://ipapi.co/json/');

        if (!response.ok) {
            throw new Error('API de geolocalización no disponible');
        }

        const data = await response.json();

        const geoData = {
            country: data.country_code || 'MX',        // ISO code: 'MX', 'CO', 'US'
            countryName: data.country_name || 'México',
            city: data.city || '',
            region: data.region || '',
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            timezone: data.timezone || '',
            language: data.languages?.split(',')[0] || 'es'
        };

        // Guardar en caché
        localStorage.setItem('geo_country_cache', JSON.stringify({
            data: geoData,
            timestamp: Date.now()
        }));

        console.log('✅ País detectado:', geoData.country, geoData.countryName);
        return geoData;

    } catch (error) {
        console.warn('⚠️ Error detectando país, usando default MX:', error.message);
        // Fallback a México
        return {
            country: 'MX',
            countryName: 'México',
            city: '',
            region: '',
            latitude: null,
            longitude: null,
            timezone: 'America/Mexico_City',
            language: 'es'
        };
    }
};

/**
 * Configuración SEO por país
 * Retorna metadata optimizada según el país del usuario
 */
export const getSEOByCountry = (country, city = '') => {
    const seoConfigs = {
        'MX': {
            title: city
                ? `Geobooker México - Encuentra Negocios en ${city}`
                : 'Geobooker México - Encuentra Negocios Cerca de Ti',
            description: `Descubre restaurantes, farmacias, tiendas y servicios cerca de tu ubicación en México. Mapa interactivo con miles de negocios verificados.`,
            keywords: 'negocios cerca de mi México, directorio empresas México, mapa negocios, servicios locales',
            locale: 'es_MX',
            canonicalDomain: 'https://geobooker.com.mx'
        },
        'CO': {
            title: city
                ? `Geobooker Colombia - Encuentra Negocios en ${city}`
                : 'Geobooker Colombia - Encuentra Negocios Cerca de Ti',
            description: `Descubre restaurantes, farmacias, tiendas y servicios cerca de tu ubicación en Colombia. Encuentra lo que necesitas con un clic.`,
            keywords: 'negocios cerca de mi Colombia, directorio empresas Colombia, mapa interactivo',
            locale: 'es_CO',
            canonicalDomain: 'https://geobooker.com.mx'
        },
        'US': {
            title: city
                ? `Geobooker USA - Find Businesses in ${city}`
                : 'Geobooker USA - Find Businesses Near You',
            description: `Discover restaurants, pharmacies, stores and services near your location in the United States. Interactive map with verified businesses.`,
            keywords: 'businesses near me USA, local business directory, find services',
            locale: 'en_US',
            canonicalDomain: 'https://geobooker.com.mx'
        },
        'ES': {
            title: city
                ? `Geobooker España - Encuentra Negocios en ${city}`
                : 'Geobooker España - Encuentra Negocios Cerca de Ti',
            description: `Descubre restaurantes, farmacias, tiendas y servicios cerca de tu ubicación en España. Mapa interactivo de negocios locales.`,
            keywords: 'negocios cerca de mi España, directorio empresas España, servicios locales',
            locale: 'es_ES',
            canonicalDomain: 'https://geobooker.com.mx'
        },
        'AR': {
            title: city
                ? `Geobooker Argentina - Encontrá Negocios en ${city}`
                : 'Geobooker Argentina - Encontrá Negocios Cerca Tuyo',
            description: `Descubrí restaurantes, farmacias, negocios y servicios cerca de tu ubicación en Argentina. Mapa interactivo actualizado.`,
            keywords: 'negocios cerca mio Argentina, directorio empresas, servicios locales',
            locale: 'es_AR',
            canonicalDomain: 'https://geobooker.com.mx'
        }
    };

    // Retornar config del país o default a México
    return seoConfigs[country] || seoConfigs['MX'];
};

/**
 * Genera Schema.org LocalBusiness optimizado por región
 */
export const getLocalBusinessSchema = (country, city) => {
    const config = getSEOByCountry(country, city);

    return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Geobooker",
        "description": config.description,
        "url": config.canonicalDomain,
        "areaServed": {
            "@type": "Country",
            "name": config.countryName || country
        },
        "address": city ? {
            "@type": "PostalAddress",
            "addressLocality": city,
            "addressCountry": country
        } : undefined
    };
};

/**
 * Limpia caché de geolocalización (útil para testing)
 */
export const clearGeoCache = () => {
    localStorage.removeItem('geo_country_cache');
    console.log('🗑️ Caché de geolocalización limpiado');
};
