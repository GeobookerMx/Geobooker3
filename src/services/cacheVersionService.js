// src/services/cacheVersionService.js

const APP_VERSION = '1.4.9';
const VERSION_KEY = 'gb_app_version';
const DB_NAMES = ['business-cache', 'google-places-cache'];
const AUTH_STORAGE_KEY = 'geobooker-auth';
const VERSIONED_LOCAL_STORAGE_KEYS = ['geobooker_active_ads_cache'];
const VERSIONED_LOCAL_STORAGE_PREFIXES = ['gp_cache_'];

/**
 * Función auxiliar para eliminar una base de datos usando la API nativa
 */
const deleteDatabase = (dbName) => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => {
            console.warn(`⚠️ Eliminación de DB ${dbName} bloqueada.`);
            resolve(); // Continuamos de todos modos
        };
    });
};

const deleteRuntimeCaches = async () => {
    if (typeof caches === 'undefined') return;

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    console.log('🧹 Caches del Service Worker eliminados.');
};

const deleteVersionedLocalStorageCaches = () => {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
        .filter(Boolean);
    const removedKeys = [];

    keys.forEach((key) => {
        const isVersionedKey = VERSIONED_LOCAL_STORAGE_KEYS.includes(key);
        const hasVersionedPrefix = VERSIONED_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));

        if (isVersionedKey || hasVersionedPrefix) {
            localStorage.removeItem(key);
            removedKeys.push(key);
        }
    });

    return removedKeys;
};

/**
 * Verifica si la versión de la app ha cambiado y limpia el caché si es necesario.
 * Esto asegura que los usuarios siempre tengan datos frescos tras un nuevo despliegue.
 */
export const checkAppVersion = async () => {
    try {
        const storedVersion = localStorage.getItem(VERSION_KEY);

        if (storedVersion !== APP_VERSION) {
            console.log(`🚀 Nueva versión detectada (${APP_VERSION}). Limpiando caché...`);

            // 1. Eliminar solo caches versionados propiedad de Geobooker.
            // Todo lo demás se conserva por diseño, especialmente:
            // - geobooker-auth (sesión Supabase)
            // - gb_cookie_consent y att_status (consentimiento)
            // - language*, userCountry*, userCity y geobooker_last_location (preferencias)
            const authSession = localStorage.getItem(AUTH_STORAGE_KEY);
            const removedLocalStorageKeys = deleteVersionedLocalStorageCaches();

            // Defensa adicional: una invalidación de caches nunca debe cerrar la sesión.
            if (authSession !== null && localStorage.getItem(AUTH_STORAGE_KEY) !== authSession) {
                localStorage.setItem(AUTH_STORAGE_KEY, authSession);
            }
            console.log('🧹 Caches localStorage eliminados:', removedLocalStorageKeys);

            // 2. Limpiar CacheStorage / Service Worker
            await deleteRuntimeCaches();

            // 3. Limpiar IndexedDB
            for (const dbName of DB_NAMES) {
                try {
                    await deleteDatabase(dbName);
                    console.log(`✅ DB ${dbName} eliminada.`);
                } catch (err) {
                    console.warn(`⚠️ No se pudo eliminar la DB ${dbName}:`, err);
                }
            }

            // 4. Guardar nueva versión
            localStorage.setItem(VERSION_KEY, APP_VERSION);
            console.log('✨ Caché purgado con éxito.');

            // Recargar la página para cargar el nuevo bundle de producción
            window.location.reload();
        } else {
            console.log(`✅ App version ${APP_VERSION} está al día.`);
        }
    } catch (error) {
        console.error('Error verificando versión de app:', error);
    }
};

export default { checkAppVersion };
