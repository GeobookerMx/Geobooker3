// src/services/navigationService.js
/**
 * Servicio para manejo de navegación externa y tracking
 * Optimizado para iOS (comgooglemaps://) y Android
 */
import { trackEvent } from './analyticsService';

/**
 * Detecta si el dispositivo es iOS
 */
export const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

/**
 * Detecta si el dispositivo es Android
 */
export const isAndroid = () => {
    return /Android/i.test(navigator.userAgent);
};

/**
 * Trackea el clic en "Ir" / "Directions" antes de abrir Maps
 */
export const trackClickDirections = (businessId, businessName, source = 'map') => {
    try {
        trackEvent('click_directions', {
            business_id: businessId,
            business_name: businessName,
            source: source, // 'map', 'profile', 'search_result'
            timestamp: new Date().toISOString()
        });
        console.log(`📍 Tracked: click_directions for ${businessName}`);
    } catch (error) {
        console.error('Error tracking directions:', error);
    }
};

/**
 * Trackea apertura de navegación externa
 */
export const trackExternalNavigation = (provider, businessId, businessName) => {
    try {
        trackEvent('open_external_navigation', {
            provider: provider, // 'google_maps', 'apple_maps', 'waze'
            business_id: businessId,
            business_name: businessName,
            device: isIOS() ? 'ios' : isAndroid() ? 'android' : 'desktop',
            timestamp: new Date().toISOString()
        });
        console.log(`🚗 Tracked: open_external_navigation (${provider}) for ${businessName}`);
    } catch (error) {
        console.error('Error tracking external navigation:', error);
    }
};

/**
 * Abre Google Maps con navegación optimizada para cada plataforma
 * @param {number} lat - Latitud destino
 * @param {number} lng - Longitud destino
 * @param {string} name - Nombre del negocio
 * @param {string} businessId - ID del negocio para tracking
 * @param {Object} origin - {lat, lng} ubicación origen (opcional)
 */
export const openMapsNavigation = (lat, lng, name, businessId = null, origin = null) => {
    if (!lat || !lng) {
        console.error('Invalid coordinates for navigation');
        return;
    }

    // Track el clic antes de abrir
    if (businessId) {
        trackClickDirections(businessId, name);
    }

    const encodedName = encodeURIComponent(name || '');

    if (isIOS()) {
        // iOS: Intentar abrir Google Maps app directamente
        const googleMapsAppUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
        const appleMapsUrl = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;

        // Intentar abrir Google Maps app
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = googleMapsAppUrl;
        document.body.appendChild(iframe);

        // Track que se abrió navegación
        trackExternalNavigation('google_maps_app', businessId, name);

        // Fallback a Apple Maps después de un delay
        setTimeout(() => {
            document.body.removeChild(iframe);
            // Si el usuario sigue en la página, abrir Apple Maps como fallback
            window.location.href = appleMapsUrl;
            trackExternalNavigation('apple_maps', businessId, name);
        }, 1500);

    } else if (isAndroid()) {
        // Android: Intent de Google Maps
        const intentUrl = `intent://maps.google.com/maps?daddr=${lat},${lng}&navigate=yes#Intent;scheme=https;package=com.google.android.apps.maps;end`;
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

        // Intentar intent, fallback a web
        try {
            window.location.href = intentUrl;
            trackExternalNavigation('google_maps_app', businessId, name);
        } catch {
            window.open(webUrl, '_blank');
            trackExternalNavigation('google_maps_web', businessId, name);
        }

    } else {
        // Desktop: Abrir en nueva pestaña
        const url = origin
            ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lat},${lng}&travelmode=driving`
            : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

        window.open(url, '_blank');
        trackExternalNavigation('google_maps_web', businessId, name);
    }
};

/**
 * Abre el teléfono para llamar
 */
export const openPhoneCall = (phone, businessId, businessName) => {
    if (!phone) return;

    trackEvent('click_call', {
        business_id: businessId,
        business_name: businessName,
        phone: phone,
        timestamp: new Date().toISOString()
    });

    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
};

/**
 * Abre WhatsApp
 */
export const openWhatsApp = (phone, businessId, businessName, message = '') => {
    if (!phone) return;

    trackEvent('click_whatsapp', {
        business_id: businessId,
        business_name: businessName,
        phone: phone,
        timestamp: new Date().toISOString()
    });

    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message || `Hola, encontré ${businessName} en Geobooker`);

    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
};

/**
 * Trackea vista de perfil
 */
export const trackViewProfile = (businessId, businessName, isFromGoogle = false) => {
    trackEvent('view_business_profile', {
        business_id: businessId,
        business_name: businessName,
        source: isFromGoogle ? 'google_places' : 'geobooker_native',
        timestamp: new Date().toISOString()
    });
};

export default {
    isIOS,
    isAndroid,
    trackClickDirections,
    trackExternalNavigation,
    openMapsNavigation,
    openPhoneCall,
    openWhatsApp,
    trackViewProfile
};
