// src/components/SEO.jsx
import { useEffect } from 'react';
import { COMPANY_INFO, CONTACT_EMAILS, SOCIAL_LINKS } from '../config/contacts';

const SEO = ({
    title = 'Geobooker - Busqueda local, negocios y servicios cerca de ti',
    description = 'Geobooker conecta necesidades reales con negocios y servicios cercanos. Encuentra, descubre y contacta negocios locales con mas claridad.',
    image = '/images/geobooker-og.png',
    url,
    type = 'website',
    business = null,
    breadcrumbs = [],
    noindex = false,
    keywords = '',
    structuredData = null
}) => {
    useEffect(() => {
        const canonicalUrl = url || window.location.href;
        const ogImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;
        const currentLang = localStorage.getItem('language') || 'es';

        document.title = title.includes('Geobooker') ? title : `${title} | Geobooker`;
        document.documentElement.lang = currentLang;

        updateMetaTag('description', description);
        if (keywords) updateMetaTag('keywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);
        updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');
        updateMetaTag('googlebot', noindex ? 'noindex, nofollow' : 'index, follow');

        updateMetaTag('og:title', title, 'property');
        updateMetaTag('og:description', description, 'property');
        updateMetaTag('og:image', ogImage, 'property');
        updateMetaTag('og:url', canonicalUrl, 'property');
        updateMetaTag('og:type', type, 'property');
        updateMetaTag('og:site_name', 'Geobooker', 'property');

        const locales = { es: 'es_MX', en: 'en_US', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR' };
        updateMetaTag('og:locale', locales[currentLang] || 'es_MX', 'property');

        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', title);
        updateMetaTag('twitter:description', description);
        updateMetaTag('twitter:image', ogImage);

        updateLinkTag('canonical', canonicalUrl);

        const path = window.location.pathname;
        const mxUrl = `https://geobooker.com.mx${path}`;
        const globalUrl = `https://geobooker.com${path}`;
        updateHreflangTag('es-MX', mxUrl);
        updateHreflangTag('es', mxUrl);
        updateHreflangTag('en', globalUrl);
        updateHreflangTag('en-US', globalUrl);
        updateHreflangTag('x-default', globalUrl);

        addWebAppSchema(currentLang);
        addOrganizationSchema();
        addWebsiteSchema(currentLang);

        if (business) addBusinessSchema(business);
        if (breadcrumbs && breadcrumbs.length > 0) addBreadcrumbSchema(breadcrumbs);
        if (structuredData) addCustomStructuredData(structuredData);

        return () => {
            const schemas = ['business', 'breadcrumbs', 'webapp', 'organization', 'website'];
            schemas.forEach((schemaKey) => {
                const existing = document.querySelector(`script[data-schema="${schemaKey}"]`);
                if (existing) existing.remove();
            });

            const customSchemas = document.querySelectorAll('script[data-schema^="custom"]');
            customSchemas.forEach((node) => node.remove());
        };
    }, [title, description, image, url, type, business, breadcrumbs, noindex, keywords, structuredData]);

    return null;
};

const updateMetaTag = (name, content, attributeName = 'name') => {
    let meta = document.querySelector(`meta[${attributeName}="${name}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attributeName, name);
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
};

const updateLinkTag = (rel, href) => {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
    }
    link.setAttribute('href', href);
};

const updateHreflangTag = (lang, href) => {
    let link = document.querySelector(`link[hreflang="${lang}"]`);
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', lang);
        document.head.appendChild(link);
    }
    link.setAttribute('href', href);
};

const addBusinessSchema = (business) => {
    const existingSchema = document.querySelector('script[data-schema="business"]');
    if (existingSchema) existingSchema.remove();

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: business.name,
        description: business.description || '',
        address: {
            '@type': 'PostalAddress',
            streetAddress: business.address || '',
            addressLocality: business.city || '',
            addressRegion: business.state || '',
            addressCountry: business.country || 'MX'
        },
        telephone: business.phone || '',
        url: business.website || window.location.href,
        image: business.image_url || '',
        priceRange: business.price_range || '$$'
    };

    if (business.latitude && business.longitude) {
        schema.geo = {
            '@type': 'GeoCoordinates',
            latitude: business.latitude,
            longitude: business.longitude
        };
    }

    if (business.rating) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: business.rating,
            reviewCount: business.review_count || 1
        };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'business');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

const addBreadcrumbSchema = (breadcrumbs) => {
    const existingSchema = document.querySelector('script[data-schema="breadcrumbs"]');
    if (existingSchema) existingSchema.remove();

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: crumb.item.startsWith('http') ? crumb.item : `${window.location.origin}${crumb.item}`
        }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'breadcrumbs');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

const addWebAppSchema = (currentLang) => {
    const existingSchema = document.querySelector('script[data-schema="webapp"]');
    if (existingSchema) existingSchema.remove();

    const descriptions = {
        es: 'Geobooker conecta necesidades reales con negocios y servicios cercanos para buscar, descubrir y contactar mejor.',
        en: 'Geobooker connects real needs with nearby businesses and services so people can search, discover and contact better.',
        zh: 'Best local business directory for nearby places and services.',
        ja: 'Best local business directory for nearby places and services.',
        ko: 'Best local business directory for nearby places and services.'
    };

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Geobooker',
        description: descriptions[currentLang] || descriptions.en,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        url: 'https://geobooker.com',
        inLanguage: ['en', 'es', 'zh', 'ja', 'ko'],
        areaServed: [
            { '@type': 'Country', name: 'Mexico' },
            { '@type': 'Country', name: 'United States' },
            { '@type': 'Country', name: 'United Kingdom' },
            { '@type': 'Country', name: 'Canada' }
        ],
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock'
        },
        author: {
            '@type': 'Organization',
            name: 'Geobooker',
            url: 'https://geobooker.com'
        }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'webapp');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

const addOrganizationSchema = () => {
    const existingSchema = document.querySelector('script[data-schema="organization"]');
    if (existingSchema) existingSchema.remove();

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: COMPANY_INFO.name,
        alternateName: COMPANY_INFO.legalName,
        url: COMPANY_INFO.website,
        logo: 'https://geobooker.com.mx/images/logo-main.png',
        description: 'Geobooker connects users, businesses and brands through local search, visibility and measurable commercial activation.',
        foundingDate: String(COMPANY_INFO.founded),
        sameAs: [
            'https://geobooker.com',
            SOCIAL_LINKS.facebook,
            SOCIAL_LINKS.instagram,
            SOCIAL_LINKS.twitter,
            SOCIAL_LINKS.linkedin,
            SOCIAL_LINKS.tiktok,
            SOCIAL_LINKS.youtube
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            email: CONTACT_EMAILS.soporte,
            contactType: 'customer support',
            availableLanguage: ['Spanish', 'English']
        },
        areaServed: [
            { '@type': 'Country', name: 'Mexico' },
            { '@type': 'Country', name: 'United States' },
            { '@type': 'Country', name: 'United Kingdom' },
            { '@type': 'Country', name: 'Canada' }
        ],
        knowsLanguage: ['es', 'en', 'fr', 'zh', 'ja', 'ko']
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'organization');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

const addWebsiteSchema = (currentLang = 'es') => {
    const existingSchema = document.querySelector('script[data-schema="website"]');
    if (existingSchema) existingSchema.remove();

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Geobooker',
        alternateName: 'Geobooker Mexico',
        description: 'Local search, business discovery and commercial activation for users, businesses and brands.',
        url: 'https://geobooker.com.mx',
        inLanguage: currentLang,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://geobooker.com.mx/?q={search_term_string}'
            },
            'query-input': 'required name=search_term_string'
        },
        publisher: {
            '@type': 'Organization',
            name: COMPANY_INFO.name,
            url: COMPANY_INFO.website
        }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'website');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

const addCustomStructuredData = (structuredData) => {
    const existingSchemas = document.querySelectorAll('script[data-schema^="custom"]');
    existingSchemas.forEach((node) => node.remove());

    const payloads = Array.isArray(structuredData) ? structuredData : [structuredData];
    payloads.filter(Boolean).forEach((payload, index) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-schema', index === 0 ? 'custom' : `custom-${index}`);
        script.textContent = JSON.stringify(payload);
        document.head.appendChild(script);
    });
};

export default SEO;
