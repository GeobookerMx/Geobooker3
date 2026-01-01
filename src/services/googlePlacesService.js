// src/services/googlePlacesService.js
/**
 * Servicio para interactuar con Google Places API
 * Incluye sistema de caché para reducir costos (ahorra ~80% de llamadas)
 * 
 * OPTIMIZACIONES:
 * - Caché de búsquedas: 1 hora por ubicación+keyword
 * - Caché de detalles: 4 horas por placeId
 * - Key basado en ubicación redondeada (agrupa ubicaciones cercanas)
 */

// ==========================================
// SISTEMA DE CACHÉ
// ==========================================
const CACHE_CONFIG = {
    SEARCH_TTL: 60 * 60 * 1000,      // 1 hora para búsquedas
    DETAILS_TTL: 4 * 60 * 60 * 1000, // 4 horas para detalles
    LOCATION_PRECISION: 3,           // Decimales para agrupar ubicaciones (~111m)
    STORAGE_KEY_PREFIX: 'gp_cache_'
};

/**
 * Genera una clave de caché basada en ubicación y keyword
 * Redondea la ubicación para agrupar búsquedas cercanas
 */
const generateCacheKey = (location, keyword, type = 'search') => {
    const roundedLat = location.lat.toFixed(CACHE_CONFIG.LOCATION_PRECISION);
    const roundedLng = location.lng.toFixed(CACHE_CONFIG.LOCATION_PRECISION);
    const normalizedKeyword = (keyword || 'nearby').toLowerCase().trim().replace(/\s+/g, '_');
    return `${CACHE_CONFIG.STORAGE_KEY_PREFIX}${type}_${roundedLat}_${roundedLng}_${normalizedKeyword}`;
};

/**
 * Guarda datos en caché
 */
const saveToCache = (key, data, ttl) => {
    try {
        const cacheEntry = {
            data,
            expires: Date.now() + ttl,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheEntry));
        console.log(`📦 Caché guardado: ${key}`);
    } catch (e) {
        console.log('⚠️ Error guardando caché:', e.message);
        // Si localStorage está lleno, limpiar caché viejo
        cleanOldCache();
    }
};

/**
 * Obtiene datos del caché si no han expirado
 */
const getFromCache = (key) => {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const entry = JSON.parse(cached);
        if (Date.now() > entry.expires) {
            localStorage.removeItem(key);
            console.log(`🗑️ Caché expirado: ${key}`);
            return null;
        }

        console.log(`✅ Usando caché: ${key} (válido por ${Math.round((entry.expires - Date.now()) / 60000)} min)`);
        return entry.data;
    } catch (e) {
        return null;
    }
};

/**
 * Limpia entradas de caché expiradas (mantenimiento)
 */
const cleanOldCache = () => {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_CONFIG.STORAGE_KEY_PREFIX)) {
                try {
                    const entry = JSON.parse(localStorage.getItem(key));
                    if (Date.now() > entry.expires) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    keysToRemove.push(key);
                }
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        if (keysToRemove.length > 0) {
            console.log(`🧹 Limpiados ${keysToRemove.length} cachés expirados`);
        }
    } catch (e) {
        console.log('Error limpiando caché:', e);
    }
};

// Limpiar caché viejo al cargar
cleanOldCache();


// ==========================================
// FUNCIONES DE BÚSQUEDA CON CACHÉ
// ==========================================

/**
 * Busca negocios cercanos usando Google Places Nearby Search
 * CON CACHÉ: Si ya buscaste lo mismo en la última hora, usa caché
 * 
 * @param {Object} location - {lat, lng} ubicación del usuario
 * @param {string} keyword - término de búsqueda (ej: "farmacia", "restaurante")
 * @param {number} radius - radio de búsqueda en metros (default: 5000m = 5km)
 * @param {boolean} forceRefresh - si true, ignora caché
 * @returns {Promise<Array>} Array de negocios encontrados
 */
export const searchNearbyPlaces = async (location, keyword, radius = 5000, forceRefresh = false) => {
    // Verificar caché primero
    const cacheKey = generateCacheKey(location, keyword, 'search');
    if (!forceRefresh) {
        const cached = getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
    }

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

        console.log(`🔍 Buscando en Google Places: "${keyword}" cerca de (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`);

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
                    isFromGoogle: true, // Marcar como dato de Google
                    // Datos adicionales de Google
                    googleData: {
                        icon: place.icon,
                        types: place.types,
                        businessStatus: place.business_status
                    }
                }));

                // Guardar en caché
                saveToCache(cacheKey, businesses, CACHE_CONFIG.SEARCH_TTL);

                resolve(businesses);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                // Sin resultados no es error, guardar en caché también
                saveToCache(cacheKey, [], CACHE_CONFIG.SEARCH_TTL);
                resolve([]);
            } else {
                reject(new Error(`Error en búsqueda: ${status}`));
            }
        });
    });
};

/**
 * Obtiene detalles completos de un negocio específico
 * CON CACHÉ: Detalles se cachean por 4 horas
 * 
 * @param {string} placeId - ID del lugar de Google
 * @param {boolean} forceRefresh - si true, ignora caché
 * @returns {Promise<Object>} Detalles completos del negocio
 */
export const getPlaceDetails = async (placeId, forceRefresh = false) => {
    // Verificar caché primero
    const cacheKey = `${CACHE_CONFIG.STORAGE_KEY_PREFIX}details_${placeId}`;
    if (!forceRefresh) {
        const cached = getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
    }

    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject(new Error('Google Maps no está cargado'));
            return;
        }

        const service = new window.google.maps.places.PlacesService(
            document.createElement('div')
        );

        // OPTIMIZACIÓN: Pedir solo campos esenciales (reduce costo)
        const request = {
            placeId: placeId,
            fields: [
                'name',
                'formatted_address',
                'formatted_phone_number',
                'website',
                'opening_hours',
                'rating',
                'user_ratings_total',
                'geometry',
                'types',
                'url'
                // NOTA: Excluimos 'photos' y 'reviews' para reducir costos
                // Agregar solo si el usuario lo solicita explícitamente
            ],
            language: 'es'
        };

        console.log(`📋 Obteniendo detalles de Google Places: ${placeId}`);

        service.getDetails(request, (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                const details = {
                    id: place.place_id,
                    name: place.name,
                    address: place.formatted_address,
                    phone: place.formatted_phone_number,
                    website: place.website,
                    rating: place.rating,
                    userRatingsTotal: place.user_ratings_total,
                    openingHours: place.opening_hours,
                    types: place.types,
                    googleMapsUrl: place.url,
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng(),
                    isFromGoogle: true
                };

                // Guardar en caché (4 horas para detalles)
                saveToCache(cacheKey, details, CACHE_CONFIG.DETAILS_TTL);

                resolve(details);
            } else {
                reject(new Error(`Error obteniendo detalles: ${status}`));
            }
        });
    });
};

/**
 * Busca negocios por tipo específico (categoría)
 * CON CACHÉ
 * 
 * @param {Object} location - {lat, lng} ubicación del usuario
 * @param {string} type - tipo de negocio (ej: "pharmacy", "restaurant")
 * @param {number} radius - radio de búsqueda en metros
 * @param {boolean} forceRefresh - si true, ignora caché
 * @returns {Promise<Array>} Array de negocios encontrados
 */
export const searchByType = async (location, type, radius = 5000, forceRefresh = false) => {
    // Verificar caché primero
    const cacheKey = generateCacheKey(location, type, 'type');
    if (!forceRefresh) {
        const cached = getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
    }

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

        console.log(`🔍 Buscando por tipo en Google Places: "${type}"`);

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
                    placeId: place.place_id,
                    isFromGoogle: true
                }));

                // Guardar en caché
                saveToCache(cacheKey, businesses, CACHE_CONFIG.SEARCH_TTL);

                resolve(businesses);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                saveToCache(cacheKey, [], CACHE_CONFIG.SEARCH_TTL);
                resolve([]);
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
    // Salud
    'farmacia': 'pharmacy',
    'farmacias': 'pharmacy',
    'hospital': 'hospital',
    'hospitales': 'hospital',
    'clínica': 'hospital',
    'clinica': 'hospital',
    'veterinaria': 'veterinary_care',
    'veterinarias': 'veterinary_care',

    // Comida
    'restaurante': 'restaurant',
    'restaurantes': 'restaurant',
    'cafetería': 'cafe',
    'cafeteria': 'cafe',
    'cafeterías': 'cafe',
    'café': 'cafe',
    'cafe': 'cafe',
    'panadería': 'bakery',
    'panaderia': 'bakery',
    'panaderías': 'bakery',
    'bar': 'bar',
    'bares': 'bar',

    // Compras
    'supermercado': 'supermarket',
    'supermercados': 'supermarket',
    'tienda': 'store',
    'tiendas': 'store',

    // Servicios personales
    'barbería': 'hair_care',
    'barberia': 'hair_care',
    'barberías': 'hair_care',
    'peluquería': 'hair_care',
    'peluqueria': 'hair_care',
    'salón de belleza': 'beauty_salon',
    'salon de belleza': 'beauty_salon',
    'spa': 'spa',
    'gimnasio': 'gym',
    'gimnasios': 'gym',
    'gym': 'gym',

    // Automotriz
    'taller mecánico': 'car_repair',
    'taller mecanico': 'car_repair',
    'talleres': 'car_repair',
    'gasolinera': 'gas_station',
    'gasolineras': 'gas_station',
    'autolavado': 'car_wash',

    // Entretenimiento
    'cine': 'movie_theater',
    'cines': 'movie_theater',
    'teatro': 'movie_theater',
    'teatros': 'movie_theater',

    // Servicios
    'lavandería': 'laundry',
    'lavanderia': 'laundry',
    'lavanderías': 'laundry',
    'banco': 'bank',
    'bancos': 'bank',

    // Educación
    'escuela': 'school',
    'escuelas': 'school',
    'universidad': 'university',
    'universidades': 'university',

    // Hospedaje
    'hotel': 'lodging',
    'hoteles': 'lodging',
    'motel': 'lodging'
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

/**
 * Estadísticas de caché (para debugging/admin)
 */
export const getCacheStats = () => {
    const stats = {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        totalSizeKB: 0
    };

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_CONFIG.STORAGE_KEY_PREFIX)) {
            stats.totalEntries++;
            try {
                const value = localStorage.getItem(key);
                stats.totalSizeKB += (value?.length || 0) / 1024;
                const entry = JSON.parse(value);
                if (Date.now() > entry.expires) {
                    stats.expiredEntries++;
                } else {
                    stats.validEntries++;
                }
            } catch (e) {
                stats.expiredEntries++;
            }
        }
    }

    stats.totalSizeKB = Math.round(stats.totalSizeKB * 100) / 100;
    return stats;
};

/**
 * Limpia todo el caché de Google Places
 */
export const clearAllCache = () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_CONFIG.STORAGE_KEY_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Limpiados ${keysToRemove.length} entradas de caché`);
    return keysToRemove.length;
};
