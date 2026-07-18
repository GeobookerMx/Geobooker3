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
    SEARCH_TTL: 24 * 60 * 60 * 1000,      // 24 horas para búsquedas (antes: 1 hora)
    DETAILS_TTL: 48 * 60 * 60 * 1000,     // 48 horas para detalles (antes: 4 horas)
    LOCATION_PRECISION: 3,                // Decimales para agrupar ubicaciones (~111m)
    STORAGE_KEY_PREFIX: 'gp_cache_'
};

/**
 * Genera una clave de caché basada en ubicación y keyword
 * Redondea la ubicación para agrupar búsquedas cercanas
 */
// EXPORTAR para uso en loading optimista
export const generateCacheKey = (location, keyword, type = 'search') => {
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
// EXPORTAR para uso en loading optimista
export const getFromCache = (key) => {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const entry = JSON.parse(cached);
        if (Date.now() > entry.expires) {
            localStorage.removeItem(key);
            console.log(`🗑️ Caché expirad o: ${key}`);
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
            language: window.localStorage.getItem('language') || 'es' // Sincronizado con i18next
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
            ],
            language: window.localStorage.getItem('language') || 'es'
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
            language: window.localStorage.getItem('language') || 'es'
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
    'medicina': 'pharmacy',
    'medicamento': 'pharmacy',
    'medicamentos': 'pharmacy',
    'omeprazol': 'pharmacy',
    'paracetamol': 'pharmacy',
    'ibuprofeno': 'pharmacy',
    'loratadina': 'pharmacy',
    'suero oral': 'pharmacy',

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
    'maquillaje': 'beauty_salon',
    'maquillista': 'beauty_salon',
    'makeup artist': 'beauty_salon',
    'peinado': 'beauty_salon',
    'pestanas': 'beauty_salon',
    'cejas': 'beauty_salon',
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

const normalizeSearchTerm = (value = '') =>
    String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const SEARCH_VARIANTS = {
    estetica: ['salon de belleza', 'beauty salon', 'hair salon', 'spa'],
    tatuaje: ['tattoo studio', 'tattoo shop', 'tatuador'],
    tatuajes: ['tattoo studio', 'tattoo shop', 'tatuador'],
    tatuador: ['tattoo studio', 'tattoo shop', 'tatuajes'],
    tattoo: ['tattoo studio', 'tattoo shop', 'tatuajes'],
    'tattoo studio': ['tattoo shop', 'tatuajes', 'tatuador'],
    manicure: ['nail salon', 'beauty salon', 'pedicure'],
    pedicure: ['nail salon', 'beauty salon', 'manicure'],
    unas: ['nail salon', 'manicure', 'pedicure'],
    spa: ['wellness spa', 'massage spa', 'facial spa'],
    barberia: ['barbershop', 'hair salon', 'peluqueria'],
    peluqueria: ['hair salon', 'beauty salon', 'barbershop'],
    michelin: ['fine dining', 'tasting menu', 'chef table'],
    'fine dining': ['chef table', 'tasting menu', 'michelin restaurant'],
    cemento: ['materiales de construccion', 'cemento y concreto', 'casa de materiales'],
    concreto: ['cemento y concreto', 'materiales de construccion', 'concrete supplier'],
    acero: ['acero y perfiles', 'steel supplier', 'materiales industriales'],
    varilla: ['acero y perfiles', 'materiales de construccion', 'steel supplier'],
    tarimas: ['tarimas y empaque', 'pallet supplier', 'packaging supplies'],
    pallets: ['tarimas y empaque', 'pallet supplier', 'packaging supplies'],
    empaque: ['tarimas y empaque', 'packaging supplies', 'cajas carton'],
    componentes: ['componentes industriales', 'industrial supplies', 'refacciones industriales'],
    refacciones: ['refacciones industriales', 'auto parts', 'spare parts'],
    quimicos: ['productos quimicos', 'chemical supplier', 'limpieza industrial'],
    alimentos: ['proveedor de alimentos', 'alimentos mayoreo', 'restaurant supplies'],
    mayoreo: ['proveedor mayoreo', 'wholesale supplier', 'distribuidor'],
    proveedor: ['distribuidor', 'supplier', 'mayoreo'],
    omeprazol: ['farmacia', 'medicamento', 'pharmacy'],
    paracetamol: ['farmacia', 'medicamento', 'pharmacy'],
    ibuprofeno: ['farmacia', 'medicamento', 'pharmacy'],
    loratadina: ['farmacia', 'medicamento', 'pharmacy'],
    antigripal: ['farmacia', 'medicamento', 'pharmacy'],
    'suero oral': ['farmacia', 'medicamento', 'pharmacy'],
    medicamento: ['farmacia', 'pharmacy', 'drugstore'],
    medicamentos: ['farmacia', 'pharmacy', 'drugstore'],
    maquillaje: ['maquillista', 'beauty salon', 'makeup artist'],
    maquillista: ['maquillaje', 'beauty salon', 'makeup artist'],
    'maquillaje de novia': ['maquillista', 'beauty salon', 'makeup artist'],
    peinado: ['salon de belleza', 'hair salon', 'beauty salon'],
    pestanas: ['salon de belleza', 'beauty salon', 'lash studio'],
    cejas: ['salon de belleza', 'beauty salon', 'brow studio']
};

export const getSearchVariants = (searchTerm = '') => {
    const normalized = normalizeSearchTerm(searchTerm);
    const variants = new Set([String(searchTerm).trim()]);

    Object.entries(SEARCH_VARIANTS).forEach(([key, related]) => {
        if (normalized === key || normalized.includes(key)) {
            related.forEach((alias) => variants.add(alias));
        }
    });

    return [...variants].filter(Boolean);
};

const mapPlaceResult = (place, fallbackCategory = 'general') => ({
    id: place.place_id,
    name: place.name,
    category: place.types?.[0] || fallbackCategory,
    address: place.formatted_address || place.vicinity,
    latitude: place.geometry.location.lat(),
    longitude: place.geometry.location.lng(),
    rating: place.rating || 0,
    userRatingsTotal: place.user_ratings_total || 0,
    isOpen: place.opening_hours?.isOpen?.() || null,
    priceLevel: place.price_level || null,
    photos: place.photos || [],
    placeId: place.place_id,
    isFromGoogle: true,
    googleData: {
        icon: place.icon,
        types: place.types,
        businessStatus: place.business_status
    }
});

const mergeUniqueBusinesses = (...groups) => {
    const merged = [];
    const seenIds = new Set();

    groups.flat().forEach((business) => {
        const key = business.placeId || business.id;
        if (!key || seenIds.has(key)) return;
        seenIds.add(key);
        merged.push(business);
    });

    return merged;
};

export const searchTextPlaces = async (location, query, radius = 10000, forceRefresh = false) => {
    const cacheKey = generateCacheKey(location, query, 'text');
    if (!forceRefresh) {
        const cached = getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
    }

    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject(new Error('Google Maps no estÃ¡ cargado'));
            return;
        }

        const service = new window.google.maps.places.PlacesService(
            document.createElement('div')
        );

        const request = {
            query,
            location: new window.google.maps.LatLng(location.lat, location.lng),
            radius,
            language: window.localStorage.getItem('language') || 'es'
        };

        console.log(`🔎 Buscando por texto en Google Places: "${query}"`);

        service.textSearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                const businesses = (results || []).map((place) => mapPlaceResult(place, query));
                saveToCache(cacheKey, businesses, CACHE_CONFIG.SEARCH_TTL);
                resolve(businesses);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                saveToCache(cacheKey, [], CACHE_CONFIG.SEARCH_TTL);
                resolve([]);
            } else {
                reject(new Error(`Error en bÃºsqueda por texto: ${status}`));
            }
        });
    });
};

export const searchPlacesUniversal = async (location, searchTerm, radius = 10000, forceRefresh = false) => {
    const normalized = normalizeSearchTerm(searchTerm);
    const placeType = getPlaceType(normalized);
    const variants = getSearchVariants(searchTerm).slice(0, 4);
    let mergedResults = [];

    if (placeType) {
        try {
            const typeResults = await searchByType(location, placeType, radius, forceRefresh);
            mergedResults = mergeUniqueBusinesses(mergedResults, typeResults);
        } catch (error) {
            console.warn('searchByType failed:', error.message);
        }
    }

    for (const variant of variants) {
        if (mergedResults.length >= 24) break;
        try {
            const textResults = await searchTextPlaces(location, variant, radius, forceRefresh);
            mergedResults = mergeUniqueBusinesses(mergedResults, textResults);
        } catch (error) {
            console.warn(`searchTextPlaces failed for "${variant}":`, error.message);
        }
    }

    if (mergedResults.length < 8) {
        try {
            const nearbyResults = await searchNearbyPlaces(location, searchTerm, radius, forceRefresh);
            mergedResults = mergeUniqueBusinesses(mergedResults, nearbyResults);
        } catch (error) {
            console.warn('searchNearbyPlaces failed:', error.message);
        }
    }

    return mergedResults;
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
