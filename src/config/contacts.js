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
    ventas: '+525526702368',
    soporte: '+525526702368',
};

// Cada número tiene una responsabilidad distinta. El canal Cloud API no debe
// sustituir al contacto humano ni anunciarse como operativo hasta completar
// suscripción WABA, webhook productivo, plantillas y consentimiento.
export const WHATSAPP_CHANNELS = Object.freeze({
    humanSupport: Object.freeze({
        e164: '+525526702368',
        waMe: '525526702368',
        display: '+52 55 2670 2368',
        label: 'Atención humana y comercial',
        public: true,
    }),
    crmCloud: Object.freeze({
        e164: '+5215574057295',
        waMe: '5215574057295',
        display: '+52 1 55 7405 7295',
        label: 'Mensajería CRM y notificaciones',
        public: false,
    }),
});

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

export const getWhatsAppLink = (channel = 'humanSupport', message = '') => {
    const contact = WHATSAPP_CHANNELS[channel] || WHATSAPP_CHANNELS.humanSupport;
    const text = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${contact.waMe}${text}`;
};
