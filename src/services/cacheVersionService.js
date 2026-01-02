// src/services/cacheVersionService.js

const APP_VERSION = '1.2.0'; // Incrementa esto para forzar limpieza de caché
const VERSION_KEY = 'gb_app_version';
const DB_NAMES = ['business-cache', 'google-places-cache'];

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

/**
 * Verifica si la versión de la app ha cambiado y limpia el caché si es necesario.
 * Esto asegura que los usuarios siempre tengan datos frescos tras un nuevo despliegue.
 */
export const checkAppVersion = async () => {
    try {
        const storedVersion = localStorage.getItem(VERSION_KEY);

        if (storedVersion !== APP_VERSION) {
            console.log(`🚀 Nueva versión detectada (${APP_VERSION}). Limpiando caché...`);

            // 1. Limpiar localStorage (excepto la versión y tokens de auth si los hubiera)
            const authKeys = ['supabase.auth.token', 'sb-access-token', 'sb-refresh_token'];
            const preservedData = {};

            authKeys.forEach(key => {
                const val = localStorage.getItem(key);
                if (val) preservedData[key] = val;
            });

            localStorage.clear();

            // Restaurar datos esenciales
            Object.entries(preservedData).forEach(([key, val]) => {
                localStorage.setItem(key, val);
            });

            // 2. Limpiar IndexedDB
            for (const dbName of DB_NAMES) {
                try {
                    await deleteDatabase(dbName);
                    console.log(`✅ DB ${dbName} eliminada.`);
                } catch (err) {
                    console.warn(`⚠️ No se pudo eliminar la DB ${dbName}:`, err);
                }
            }

            // 3. Guardar nueva versión
            localStorage.setItem(VERSION_KEY, APP_VERSION);
            console.log('✨ Caché purgado con éxito.');

            // Opcional: Recargar la página si es crítico
            // window.location.reload();
        } else {
            console.log(`✅ App version ${APP_VERSION} está al día.`);
        }
    } catch (error) {
        console.error('Error verificando versión de app:', error);
    }
};

export default { checkAppVersion };
