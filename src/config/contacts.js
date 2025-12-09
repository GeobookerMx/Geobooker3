// src/config/contacts.js
// Configuración centralizada de emails y contactos de Geobooker

export const CONTACT_EMAILS = {
    // Email principal de ventas
    ventas: 'ventasgeobooker@gmail.com',

    // Email de soporte (configurar cuando esté disponible)
    soporte: 'ventasgeobooker@gmail.com',

    // Email de admin (configurar cuando esté disponible)
    admin: 'ventasgeobooker@gmail.com',

    // Email para anunciantes
    publicidad: 'ventasgeobooker@gmail.com',
};

export const SOCIAL_LINKS = {
    facebook: 'https://facebook.com/geobooker.mx',
    instagram: 'https://instagram.com/geobooker.mx',
    twitter: 'https://twitter.com/geobookermx',
    linkedin: 'https://linkedin.com/company/geobooker',
    tiktok: 'https://tiktok.com/@geobooker.mx',
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
