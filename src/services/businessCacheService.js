// src/services/businessCacheService.js
/**
 * Servicio de caché para negocios nativos de Geobooker
 * Usa IndexedDB para almacenamiento persistente y rápido
 * 
 * BENEFICIOS:
 * - Carga instantánea de negocios cercanos
 * - Funciona offline
 * - Reduce llamadas a Supabase
 * - Actualización inteligente (solo si usuario se movió > 500m)
 */

const DB_NAME = 'geobooker_cache';
const DB_VERSION = 1;
const STORES = {
    BUSINESSES: 'businesses',
    LOCATION_CACHE: 'location_cache'
};

const CACHE_CONFIG = {
    MAX_AGE_MS: 30 * 60 * 1000,  // 30 minutos
    MIN_DISTANCE_FOR_REFRESH: 500, // 500 metros
    MAX_BUSINESSES: 500 // Límite de negocios en caché
};

let db = null;

/**
 * Inicializa la base de datos IndexedDB
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        if (!window.indexedDB) {
            console.log('⚠️ IndexedDB no soportado, usando solo Supabase');
            reject(new Error('IndexedDB no soportado'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Error abriendo IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('📦 IndexedDB inicializada');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Store para negocios
            if (!database.objectStoreNames.contains(STORES.BUSINESSES)) {
                const businessStore = database.createObjectStore(STORES.BUSINESSES, { keyPath: 'id' });
                businessStore.createIndex('category', 'category', { unique: false });
                businessStore.createIndex('updated_at', 'cached_at', { unique: false });
            }

            // Store para metadata de ubicación
            if (!database.objectStoreNames.contains(STORES.LOCATION_CACHE)) {
                database.createObjectStore(STORES.LOCATION_CACHE, { keyPath: 'key' });
            }

            console.log('📦 IndexedDB schema creado');
        };
    });
};

/**
 * Calcula distancia entre dos puntos (Haversine)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Guarda negocios en caché
 */
export const cacheBusinesses = async (businesses, location) => {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORES.BUSINESSES, STORES.LOCATION_CACHE], 'readwrite');
        const businessStore = transaction.objectStore(STORES.BUSINESSES);
        const locationStore = transaction.objectStore(STORES.LOCATION_CACHE);

        // Agregar timestamp a cada negocio
        const timestamp = Date.now();
        businesses.forEach(business => {
            businessStore.put({
                ...business,
                cached_at: timestamp
            });
        });

        // Guardar ubicación y timestamp del caché
        locationStore.put({
            key: 'last_cache',
            lat: location.lat,
            lng: location.lng,
            timestamp: timestamp,
            count: businesses.length
        });

        console.log(`📦 ${businesses.length} negocios guardados en caché`);
    } catch (error) {
        console.error('Error guardando en caché:', error);
    }
};

/**
 * Verifica si el caché es válido
 * @returns {Object} { isValid, reason, cachedLocation }
 */
export const isCacheValid = async (currentLocation) => {
    try {
        const database = await initDB();
        const transaction = database.transaction(STORES.LOCATION_CACHE, 'readonly');
        const store = transaction.objectStore(STORES.LOCATION_CACHE);

        return new Promise((resolve) => {
            const request = store.get('last_cache');

            request.onsuccess = () => {
                const cacheInfo = request.result;

                if (!cacheInfo) {
                    resolve({ isValid: false, reason: 'No cache exists' });
                    return;
                }

                // Verificar edad del caché
                const age = Date.now() - cacheInfo.timestamp;
                if (age > CACHE_CONFIG.MAX_AGE_MS) {
                    resolve({ isValid: false, reason: 'Cache expired', cachedLocation: cacheInfo });
                    return;
                }

                // Verificar distancia (si usuario se movió mucho)
                if (currentLocation) {
                    const distance = calculateDistance(
                        cacheInfo.lat, cacheInfo.lng,
                        currentLocation.lat, currentLocation.lng
                    );
                    if (distance > CACHE_CONFIG.MIN_DISTANCE_FOR_REFRESH) {
                        resolve({
                            isValid: false,
                            reason: `User moved ${Math.round(distance)}m`,
                            cachedLocation: cacheInfo
                        });
                        return;
                    }
                }

                resolve({
                    isValid: true,
                    cachedLocation: cacheInfo,
                    age: Math.round(age / 60000) // en minutos
                });
            };

            request.onerror = () => {
                resolve({ isValid: false, reason: 'DB error' });
            };
        });
    } catch (error) {
        return { isValid: false, reason: error.message };
    }
};

/**
 * Obtiene negocios del caché
 */
export const getCachedBusinesses = async (categoryFilter = null) => {
    try {
        const database = await initDB();
        const transaction = database.transaction(STORES.BUSINESSES, 'readonly');
        const store = transaction.objectStore(STORES.BUSINESSES);

        return new Promise((resolve) => {
            let request;

            if (categoryFilter) {
                const index = store.index('category');
                request = index.getAll(categoryFilter);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                const businesses = request.result || [];
                console.log(`📦 ${businesses.length} negocios cargados del caché${categoryFilter ? ` (${categoryFilter})` : ''}`);
                resolve(businesses);
            };

            request.onerror = () => {
                console.error('Error leyendo caché:', request.error);
                resolve([]);
            };
        });
    } catch (error) {
        console.error('Error obteniendo caché:', error);
        return [];
    }
};

/**
 * Limpia el caché completo
 */
export const clearCache = async () => {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORES.BUSINESSES, STORES.LOCATION_CACHE], 'readwrite');

        await Promise.all([
            new Promise((resolve) => {
                const request = transaction.objectStore(STORES.BUSINESSES).clear();
                request.onsuccess = () => resolve();
            }),
            new Promise((resolve) => {
                const request = transaction.objectStore(STORES.LOCATION_CACHE).clear();
                request.onsuccess = () => resolve();
            })
        ]);

        console.log('🗑️ Caché de negocios limpiado');
    } catch (error) {
        console.error('Error limpiando caché:', error);
    }
};

/**
 * Estadísticas del caché (para admin/debugging)
 */
export const getCacheStats = async () => {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORES.BUSINESSES, STORES.LOCATION_CACHE], 'readonly');
        const businessStore = transaction.objectStore(STORES.BUSINESSES);
        const locationStore = transaction.objectStore(STORES.LOCATION_CACHE);

        const [businessCount, cacheInfo] = await Promise.all([
            new Promise((resolve) => {
                const request = businessStore.count();
                request.onsuccess = () => resolve(request.result);
            }),
            new Promise((resolve) => {
                const request = locationStore.get('last_cache');
                request.onsuccess = () => resolve(request.result);
            })
        ]);

        return {
            businessCount,
            lastUpdate: cacheInfo?.timestamp ? new Date(cacheInfo.timestamp).toLocaleString() : 'Never',
            lastLocation: cacheInfo ? { lat: cacheInfo.lat, lng: cacheInfo.lng } : null,
            ageMinutes: cacheInfo ? Math.round((Date.now() - cacheInfo.timestamp) / 60000) : null
        };
    } catch (error) {
        return { error: error.message };
    }
};

// Inicializar DB al importar
initDB().catch(console.error);

export default {
    cacheBusinesses,
    getCachedBusinesses,
    isCacheValid,
    clearCache,
    getCacheStats
};
