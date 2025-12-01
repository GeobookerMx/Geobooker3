// src/services/googlePlacesService.js
/**
 * Servicio para interactuar con Google Places API
 * Busca negocios cercanos usando la ubicación del usuario
 */

/**
 * Busca negocios cercanos usando Google Places Nearby Search
 * @param {Object} location - {lat, lng} ubicación del usuario
 * @param {string} keyword - término de búsqueda (ej: "farmacia", "restaurante")
 * @param {number} radius - radio de búsqueda en metros (default: 5000m = 5km)
 * @returns {Promise<Array>} Array de negocios encontrados
 */
export const searchNearbyPlaces = async (location, keyword, radius = 5000) => {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject(new Error('Google Maps no está cargado'));
            return;
        }

        const service = new window.google.maps.places.PlacesService(
            document.createElement('div')
        );

        const request = {
            location: new window.google.maps.LatLng(location.lat, location.lng),
            radius: radius,
            keyword: keyword,
            language: 'es' // Resultados en español
        };

        service.nearbySearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                // Transformar resultados al formato de nuestra app
                const businesses = results.map((place) => ({
                    id: place.place_id,
                    name: place.name,
                    category: place.types?.[0] || 'general',
                    address: place.vicinity,
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng(),
                    rating: place.rating || 0,
                    userRatingsTotal: place.user_ratings_total || 0,
                    isOpen: place.opening_hours?.isOpen?.() || null,
                    priceLevel: place.price_level || null,
                    photos: place.photos || [],
                    placeId: place.place_id,
                    // Datos adicionales de Google
                    googleData: {
                        icon: place.icon,
                        types: place.types,
                        businessStatus: place.business_status
                    }
                }));
                resolve(businesses);
            } else {
                reject(new Error(`Error en búsqueda: ${status}`));
            }
        });
    });
};

/**
 * Obtiene detalles completos de un negocio específico
 * @param {string} placeId - ID del lugar de Google
 * @returns {Promise<Object>} Detalles completos del negocio
 */
export const getPlaceDetails = async (placeId) => {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject(new Error('Google Maps no está cargado'));
            return;
        }

        const service = new window.google.maps.places.PlacesService(
            document.createElement('div')
        );

        const request = {
            placeId: placeId,
            fields: [
                'name',
                'formatted_address',
                'formatted_phone_number',
                'international_phone_number',
                'website',
                'opening_hours',
                'rating',
                'user_ratings_total',
                'reviews',
                'photos',
                'geometry',
                'price_level',
                'types',
                'url'
            ],
            language: 'es'
        };

        service.getDetails(request, (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                const details = {
                    id: place.place_id,
                    name: place.name,
                    address: place.formatted_address,
                    phone: place.formatted_phone_number || place.international_phone_number,
                    website: place.website,
                    rating: place.rating,
                    userRatingsTotal: place.user_ratings_total,
                    reviews: place.reviews || [],
                    photos: place.photos || [],
                    openingHours: place.opening_hours,
                    priceLevel: place.price_level,
                    types: place.types,
                    googleMapsUrl: place.url,
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng()
                };
                resolve(details);
            } else {
                reject(new Error(`Error obteniendo detalles: ${status}`));
            }
        });
    });
};

/**
 * Busca negocios por tipo específico (categoría)
 * @param {Object} location - {lat, lng} ubicación del usuario
 * @param {string} type - tipo de negocio (ej: "pharmacy", "restaurant")
 * @param {number} radius - radio de búsqueda en metros
 * @returns {Promise<Array>} Array de negocios encontrados
 */
export const searchByType = async (location, type, radius = 5000) => {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject(new Error('Google Maps no está cargado'));
            return;
        }

        const service = new window.google.maps.places.PlacesService(
            document.createElement('div')
        );

        const request = {
            location: new window.google.maps.LatLng(location.lat, location.lng),
            radius: radius,
            type: type,
            language: 'es'
        };

        service.nearbySearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                const businesses = results.map((place) => ({
                    id: place.place_id,
                    name: place.name,
                    category: place.types?.[0] || type,
                    address: place.vicinity,
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng(),
                    rating: place.rating || 0,
                    userRatingsTotal: place.user_ratings_total || 0,
                    isOpen: place.opening_hours?.isOpen?.() || null,
                    priceLevel: place.price_level || null,
                    photos: place.photos || [],
                    placeId: place.place_id
                }));
                resolve(businesses);
            } else {
                reject(new Error(`Error en búsqueda por tipo: ${status}`));
            }
        });
    });
};

/**
 * Mapeo de categorías en español a tipos de Google Places
 */
export const CATEGORY_MAPPING = {
    'farmacia': 'pharmacy',
    'restaurante': 'restaurant',
    'barbería': 'hair_care',
    'supermercado': 'supermarket',
    'gimnasio': 'gym',
    'veterinaria': 'veterinary_care',
    'taller mecánico': 'car_repair',
    'lavandería': 'laundry',
    'cafetería': 'cafe',
    'panadería': 'bakery',
    'hospital': 'hospital',
    'escuela': 'school',
    'banco': 'bank',
    'gasolinera': 'gas_station',
    'hotel': 'lodging',
    'bar': 'bar',
    'cine': 'movie_theater',
    'tienda': 'store'
};

/**
 * Obtiene el tipo de Google Places basado en la búsqueda en español
 * @param {string} searchTerm - término de búsqueda en español
 * @returns {string|null} tipo de Google Places o null
 */
export const getPlaceType = (searchTerm) => {
    const normalized = searchTerm.toLowerCase().trim();
    return CATEGORY_MAPPING[normalized] || null;
};
