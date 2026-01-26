// src/utils/logger.js
/**
 * Logger utility para Geobooker
 * Elimina console.logs en producción automáticamente
 * 
 * USO:
 * import { logger } from './utils/logger';
 * 
 * logger.dev('Info de desarrollo');     // Solo en desarrollo
 * logger.info('Información general');   // Solo en desarrollo
 * logger.warn('Advertencia');           // Siempre se muestra
 * logger.error('Error crítico');        // Siempre se muestra
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// Estilos para consola (solo dev)
const styles = {
    dev: 'color: #3B82F6; font-weight: bold',
    info: 'color: #10B981; font-weight: bold',
    warn: 'color: #F59E0B; font-weight: bold',
    error: 'color: #EF4444; font-weight: bold',
    success: 'color: #22C55E; font-weight: bold'
};

export const logger = {
    /**
     * Log de desarrollo - Solo visible en DEV
     * Se elimina completamente en producción
     */
    dev: (...args) => {
        if (isDev) {
            console.log('%c[DEV]', styles.dev, ...args);
        }
    },

    /**
     * Log informativo - Solo visible en DEV
     * Se elimina completamente en producción
     */
    info: (...args) => {
        if (isDev) {
            console.info('%c[INFO]', styles.info, ...args);
        }
    },

    /**
     * Log de éxito - Solo visible en DEV
     */
    success: (...args) => {
        if (isDev) {
            console.log('%c[✓]', styles.success, ...args);
        }
    },

    /**
     * Advertencia - SE MUESTRA EN PRODUCCIÓN
     * Úsalo para warnings importantes
     */
    warn: (...args) => {
        console.warn('%c[WARN]', styles.warn, ...args);
    },

    /**
     * Error - SE MUESTRA EN PRODUCCIÓN
     * Úsalo para errores críticos
     */
    error: (...args) => {
        console.error('%c[ERROR]', styles.error, ...args);
    },

    /**
     * Grupo de logs (solo dev)
     */
    group: (title, callback) => {
        if (isDev) {
            console.group(title);
            callback();
            console.groupEnd();
        }
    },

    /**
     * Tabla de datos (solo dev)
     */
    table: (data) => {
        if (isDev) {
            console.table(data);
        }
    },

    /**
     * Timer para medir performance (solo dev)
     */
    time: (label) => {
        if (isDev) {
            console.time(label);
        }
    },

    timeEnd: (label) => {
        if (isDev) {
            console.timeEnd(label);
        }
    }
};

// Export default para compatibilidad
export default logger;
