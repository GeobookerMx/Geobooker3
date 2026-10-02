// src/services/geoLocationService.js
// Detects country/city for language, SEO and regional UX. It never blocks the app.

import { DOMAIN_STRATEGY } from '../config/domainStrategy';

const GEO_CACHE_KEY = 'geo_country_cache';
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const COUNTRY_SEO = {
  MX: {
    label: 'Mexico',
    language: 'es',
    locale: 'es_MX',
    canonicalDomain: DOMAIN_STRATEGY.mexicoOrigin,
    title: (city) => city
      ? `Geobooker Mexico - Encuentra negocios en ${city}`
      : 'Geobooker Mexico - Encuentra negocios cerca de ti',
    description: 'Descubre restaurantes, farmacias, tiendas y servicios cerca de tu ubicacion en Mexico.',
    keywords: 'negocios cerca de mi Mexico, directorio empresas Mexico, mapa negocios, servicios locales'
  },
  US: {
    label: 'United States',
    language: 'en',
    locale: 'en_US',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker USA - Find businesses in ${city}`
      : 'Geobooker USA - Find businesses near you',
    description: 'Find restaurants, shops, services and local places near you with Geobooker.',
    keywords: 'businesses near me, local business directory, find local services, local map'
  },
  CA: {
    label: 'Canada',
    language: 'en',
    locale: 'en_CA',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker Canada - Find businesses in ${city}`
      : 'Geobooker Canada - Find businesses near you',
    description: 'Explore nearby businesses, services and local places across Canada.',
    keywords: 'businesses near me Canada, local services Canada, business map'
  },
  GB: {
    label: 'United Kingdom',
    language: 'en',
    locale: 'en_GB',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker UK - Find local businesses in ${city}`
      : 'Geobooker UK - Find local businesses near you',
    description: 'Search local businesses, services and places across the United Kingdom.',
    keywords: 'local businesses UK, businesses near me, local services'
  },
  ES: {
    label: 'Spain',
    language: 'es',
    locale: 'es_ES',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker Espana - Encuentra negocios en ${city}`
      : 'Geobooker Espana - Encuentra negocios cerca de ti',
    description: 'Descubre negocios, restaurantes, tiendas y servicios locales en Espana.',
    keywords: 'negocios cerca de mi Espana, directorio empresas Espana, servicios locales'
  },
  CO: {
    label: 'Colombia',
    language: 'es',
    locale: 'es_CO',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker Colombia - Encuentra negocios en ${city}`
      : 'Geobooker Colombia - Encuentra negocios cerca de ti',
    description: 'Encuentra negocios, servicios y lugares locales en Colombia.',
    keywords: 'negocios cerca de mi Colombia, directorio empresas Colombia, servicios locales'
  },
  FR: {
    label: 'France',
    language: 'fr',
    locale: 'fr_FR',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker France - Trouvez des entreprises a ${city}`
      : 'Geobooker France - Trouvez des entreprises pres de vous',
    description: 'Trouvez des restaurants, commerces, services et lieux locaux avec Geobooker.',
    keywords: 'entreprises pres de moi France, services locaux, carte commerces'
  },
  JP: {
    label: 'Japan',
    language: 'ja',
    locale: 'ja_JP',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker Japan - Local businesses in ${city}`
      : 'Geobooker Japan - Find businesses near you',
    description: 'Explore nearby businesses, services and places in Japan.',
    keywords: 'Japan local businesses, businesses near me, local services Japan'
  },
  KR: {
    label: 'South Korea',
    language: 'ko',
    locale: 'ko_KR',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker Korea - Local businesses in ${city}`
      : 'Geobooker Korea - Find businesses near you',
    description: 'Explore nearby businesses, services and places in South Korea.',
    keywords: 'Korea local businesses, businesses near me, local services Korea'
  },
  SG: {
    label: 'Singapore',
    language: 'en',
    locale: 'en_SG',
    canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
    title: (city) => city
      ? `Geobooker Singapore - Find businesses in ${city}`
      : 'Geobooker Singapore - Find businesses near you',
    description: 'Find nearby restaurants, shops, services and local places in Singapore.',
    keywords: 'businesses near me Singapore, local services Singapore, business map'
  }
};

const DEFAULT_GLOBAL_SEO = {
  label: 'Global',
  language: 'en',
  locale: 'en',
  canonicalDomain: DOMAIN_STRATEGY.globalOrigin,
  title: (city) => city
    ? `Geobooker - Find local businesses in ${city}`
    : 'Geobooker - Find local businesses near you',
  description: 'Discover nearby businesses, services, products and commercial places with Geobooker.',
  keywords: 'businesses near me, local search, business directory, services near me'
};

const getCachedGeo = () => {
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - Number(timestamp || 0) > GEO_CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
};

export const detectUserCountry = async () => {
  try {
    const cached = getCachedGeo();
    if (cached) {
      console.log('Country detected from cache:', cached.country);
      return cached;
    }

    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Geo API unavailable');

    const data = await response.json();
    const country = data.country_code || 'US';
    const countryConfig = COUNTRY_SEO[country] || DEFAULT_GLOBAL_SEO;
    const geoData = {
      country,
      countryName: data.country_name || countryConfig.label,
      city: data.city || '',
      region: data.region || '',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      timezone: data.timezone || '',
      language: data.languages?.split(',')[0] || countryConfig.language
    };

    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
      data: geoData,
      timestamp: Date.now()
    }));

    console.log('Country detected:', geoData.country, geoData.countryName);
    return geoData;
  } catch (error) {
    console.warn('Country detection failed, using global fallback:', error.message);
    return {
      country: 'US',
      countryName: 'Global',
      city: '',
      region: '',
      latitude: null,
      longitude: null,
      timezone: 'UTC',
      language: 'en'
    };
  }
};

export const getSEOByCountry = (country, city = '') => {
  const config = COUNTRY_SEO[String(country || '').toUpperCase()] || DEFAULT_GLOBAL_SEO;
  return {
    title: config.title(city),
    description: config.description,
    keywords: config.keywords,
    locale: config.locale,
    canonicalDomain: config.canonicalDomain,
    countryName: config.label,
    language: config.language
  };
};

export const getLocalBusinessSchema = (country, city) => {
  const config = getSEOByCountry(country, city);

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Geobooker',
    description: config.description,
    url: config.canonicalDomain,
    areaServed: {
      '@type': 'Country',
      name: config.countryName || country
    },
    address: city ? {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressCountry: country
    } : undefined
  };
};

export const clearGeoCache = () => {
  localStorage.removeItem(GEO_CACHE_KEY);
  console.log('Geo country cache cleared');
};
