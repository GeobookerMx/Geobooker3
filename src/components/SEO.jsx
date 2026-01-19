// src/components/SEO.jsx
import { useEffect } from 'react';

/**
 * Componente SEO para manejar meta tags dinámicos
 * @param {Object} props
 * @param {string} props.title - Título de la página
 * @param {string} props.description - Descripción para meta description
 * @param {string} props.image - URL de imagen para Open Graph
 * @param {string} props.url - URL canónica de la página
 * @param {string} props.type - Tipo de contenido (website, article, business.business)
 * @param {Object} props.business - Datos del negocio para Schema.org
 * @param {Array} props.breadcrumbs - Arreglo de {name, item} para Breadcrumbs
 */
const SEO = ({
    title = 'Geobooker - Directorio de Negocios',
    description = 'Encuentra los mejores negocios cerca de ti. Restaurantes, tiendas, servicios y más.',
    image = '/images/geobooker-og.png',
    url,
    type = 'website',
    business = null,
    breadcrumbs = []
}) => {
    useEffect(() => {
        const canonicalUrl = url || window.location.href;
        const ogImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;
        const currentLang = localStorage.getItem('language') || 'es';

        // Actualizar título y atributo lang en <html>
        document.title = title.includes('Geobooker') ? title : `${title} | Geobooker`;
        document.documentElement.lang = currentLang;

        // Actualizar meta tags
        updateMetaTag('description', description);

        // Open Graph
        updateMetaTag('og:title', title, 'property');
        updateMetaTag('og:description', description, 'property');
        updateMetaTag('og:image', ogImage, 'property');
        updateMetaTag('og:url', canonicalUrl, 'property');
        updateMetaTag('og:type', type, 'property');
        updateMetaTag('og:site_name', 'Geobooker', 'property');

        // Locale dinámico
        const locales = { es: 'es_MX', en: 'en_US', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR' };
        updateMetaTag('og:locale', locales[currentLang] || 'es_MX', 'property');

        // Twitter Card
        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', title);
        updateMetaTag('twitter:description', description);
        updateMetaTag('twitter:image', ogImage);

        // Canonical URL y Hreflang
        updateLinkTag('canonical', canonicalUrl);

        // Hreflang - Cross-Domain Strategy
        const path = window.location.pathname;
        const mxUrl = `https://geobooker.com.mx${path}`;
        const globalUrl = `https://geobooker.com${path}`;

        // 1. México (Oficial en Español)
        updateHreflangTag('es-MX', mxUrl);
        updateHreflangTag('es', mxUrl);

        // 2. Global (Oficial en Inglés)
        updateHreflangTag('en', globalUrl);
        updateHreflangTag('x-default', globalUrl);

        // 3. Otros idiomas asiáticos (servidos por Global con params)
        ['zh', 'ja', 'ko'].forEach(lang => {
            updateHreflangTag(lang, `${globalUrl}?lang=${lang}`);
        });

        // Schema.org para negocios locales
        if (business) {
            addBusinessSchema(business);
        }

        // Schema.org para Breadcrumbs
        if (breadcrumbs && breadcrumbs.length > 0) {
            addBreadcrumbSchema(breadcrumbs);
        }

        // Cleanup
        return () => {
            const schemas = ['business', 'breadcrumbs'];
            schemas.forEach(s => {
                const existing = document.querySelector(`script[data-schema="${s}"]`);
                if (existing) existing.remove();
            });
        };
    }, [title, description, image, url, type, business, breadcrumbs]);

    return null;
};

// Helper para actualizar meta tags
const updateMetaTag = (name, content, attributeName = 'name') => {
    let meta = document.querySelector(`meta[${attributeName}="${name}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attributeName, name);
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
};

// Helper para actualizar link tags
const updateLinkTag = (rel, href) => {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
    }
    link.setAttribute('href', href);
};

// Helper para hreflang
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

// Helper para agregar Schema.org de negocio local
const addBusinessSchema = (business) => {
    // Remover schema existente
    const existingSchema = document.querySelector('script[data-schema="business"]');
    if (existingSchema) {
        existingSchema.remove();
    }

    const schema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": business.name,
        "description": business.description || '',
        "address": {
            "@type": "PostalAddress",
            "streetAddress": business.address || '',
            "addressLocality": business.city || '',
            "addressRegion": business.state || '',
            "addressCountry": "MX"
        },
        "telephone": business.phone || '',
        "url": business.website || window.location.href,
        "image": business.image_url || '',
        "priceRange": business.price_range || '$$',
    };

    // Agregar coordenadas si están disponibles
    if (business.latitude && business.longitude) {
        schema.geo = {
            "@type": "GeoCoordinates",
            "latitude": business.latitude,
            "longitude": business.longitude
        };
    }

    // Agregar rating si está disponible
    if (business.rating) {
        schema.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": business.rating,
            "reviewCount": business.review_count || 1
        };
    }

    // Crear script tag
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'business');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

// Helper para agregar Breadcrumb Schema.org
const addBreadcrumbSchema = (breadcrumbs) => {
    const existingSchema = document.querySelector('script[data-schema="breadcrumbs"]');
    if (existingSchema) {
        existingSchema.remove();
    }

    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": crumb.name,
            "item": crumb.item.startsWith('http') ? crumb.item : `${window.location.origin}${crumb.item}`
        }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'breadcrumbs');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

export default SEO;
