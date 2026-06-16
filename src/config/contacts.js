// src/config/contacts.js
// Configuración centralizada de emails y contactos de Geobooker

export const CONTACT_EMAILS = {
    // Email principal de ventas
    ventas: 'hola@geobooker.com.mx',

    // Email de soporte (configurar cuando esté disponible)
    soporte: 'hola@geobooker.com.mx',

    // Email de admin (configurar cuando esté disponible)
    admin: 'hola@geobooker.com.mx',

    // Email para anunciantes
    publicidad: 'hola@geobooker.com.mx',
};

export const SOCIAL_LINKS = {
    facebook: 'https://www.facebook.com/Geobooker',
    instagram: 'https://www.instagram.com/geobookermx',
    twitter: 'https://twitter.com/GeoBookermx',
    linkedin: 'https://linkedin.com/company/geobooker',
    tiktok: 'https://www.tiktok.com/@geobookermx',
    youtube: 'https://www.youtube.com/@Geobooker',
};

export const PHONE_NUMBERS = {
    ventas: null, // Agregar cuando esté disponible
    soporte: null,
};

export const COMPANY_INFO = {
    name: 'Geobooker',
    legalName: 'Geobooker México',
    website: 'https://geobooker.com.mx',
    founded: 2024,
    country: 'México',
};

// Función helper para crear mailto link
export const getMailtoLink = (type, subject = '') => {
    const email = CONTACT_EMAILS[type] || CONTACT_EMAILS.ventas;
    const subjectParam = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    return `mailto:${email}${subjectParam}`;
};
