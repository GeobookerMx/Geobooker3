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

        // 2. Global (Oficial en Inglés - USA/UK/CA/AU)
        updateHreflangTag('en', globalUrl);
        updateHreflangTag('en-US', globalUrl);
        updateHreflangTag('en-GB', `${globalUrl}?region=uk`);
        updateHreflangTag('en-CA', `${globalUrl}?region=ca`);
        updateHreflangTag('x-default', globalUrl);

        // 3. Otros idiomas asiáticos (servidos por Global con params)
        ['zh', 'ja', 'ko'].forEach(lang => {
            updateHreflangTag(lang, `${globalUrl}?lang=${lang}`);
        });

        // 4. Schema.org WebApplication para PWA internacional
        addWebAppSchema(currentLang);

        // 5. Schema.org Organization (marca)
        addOrganizationSchema();

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
            const schemas = ['business', 'breadcrumbs', 'webapp', 'organization'];
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

// Helper para agregar Schema.org WebApplication internacional
const addWebAppSchema = (currentLang) => {
    const existingSchema = document.querySelector('script[data-schema="webapp"]');
    if (existingSchema) {
        existingSchema.remove();
    }

    // Descripciones por idioma
    const descriptions = {
        es: 'El mejor directorio de negocios locales. Encuentra restaurantes, tiendas, servicios y más cerca de ti.',
        en: 'The best local business directory. Find restaurants, shops, services and more near you.',
        zh: '最佳本地商业目录。在您附近找到餐厅、商店、服务等。',
        ja: '最高の地元ビジネスディレクトリ。近くのレストラン、お店、サービスなどを見つけましょう。',
        ko: '최고의 지역 비즈니스 디렉토리. 근처의 레스토랑, 상점, 서비스 등을 찾아보세요.'
    };

    const schema = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Geobooker",
        "description": descriptions[currentLang] || descriptions.en,
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Any",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "url": "https://geobooker.com",
        "inLanguage": ["en", "es", "zh", "ja", "ko"],
        "areaServed": [
            { "@type": "Country", "name": "United States" },
            { "@type": "Country", "name": "Canada" },
            { "@type": "Country", "name": "United Kingdom" },
            { "@type": "Country", "name": "Mexico" },
            { "@type": "Country", "name": "Australia" }
        ],
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "150",
            "bestRating": "5",
            "worstRating": "1"
        },
        "author": {
            "@type": "Organization",
            "name": "Geobooker",
            "url": "https://geobooker.com"
        }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'webapp');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

// Helper para agregar Schema.org Organization (marca Geobooker)
const addOrganizationSchema = () => {
    const existingSchema = document.querySelector('script[data-schema="organization"]');
    if (existingSchema) {
        existingSchema.remove();
    }

    const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Geobooker",
        "alternateName": "Geobooker México",
        "url": "https://geobooker.com.mx",
        "logo": "https://geobooker.com.mx/images/logo-main.png",
        "description": "Mexico's leading local business directory. Find restaurants, shops, services and more near you.",
        "foundingDate": "2025",
        "sameAs": [
            "https://geobooker.com"
        ],
        "contactPoint": {
            "@type": "ContactPoint",
            "email": "soporte@geobooker.com",
            "contactType": "customer support",
            "availableLanguage": ["Spanish", "English"]
        },
        "areaServed": [
            { "@type": "Country", "name": "Mexico" },
            { "@type": "Country", "name": "United States" },
            { "@type": "Country", "name": "United Kingdom" },
            { "@type": "Country", "name": "Canada" }
        ],
        "knowsLanguage": ["es", "en", "fr", "zh", "ja", "ko"]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'organization');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
};

export default SEO;
