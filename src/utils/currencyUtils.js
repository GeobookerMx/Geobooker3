/**
 * Utilidades para manejo de moneda dinámica (USD, MXN, GBP)
 */

const CURRENCY_CONFIG = {
    MX: { code: 'MXN', symbol: '$', rate: 1, name: 'Pesos Mexicanos' },
    US: { code: 'USD', symbol: '$', rate: 0.05, name: 'US Dollars' }, // Ejemplo, idealmente usar API de tipos de cambio
    GB: { code: 'GBP', symbol: '£', rate: 0.04, name: 'British Pounds' },
    CA: { code: 'CAD', symbol: '$', rate: 0.07, name: 'Canadian Dollars' },
    DEFAULT: { code: 'USD', symbol: '$', rate: 0.05, name: 'US Dollars' }
};

/**
 * Obtiene la configuración de moneda actual basada en el país detectado
 */
export const getCurrencyConfig = () => {
    const country = localStorage.getItem('userCountryCode') || 'MX';
    return CURRENCY_CONFIG[country] || CURRENCY_CONFIG.DEFAULT;
};

/**
 * Formatea un precio según la región
 * @param {number} amountInMXN - Cantidad base en pesos mexicanos
 */
export const formatPrice = (amountInMXN) => {
    const config = getCurrencyConfig();

    // Si es México, mostrar original
    if (config.code === 'MXN') {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amountInMXN);
    }

    // Si es internacional, convertir (usamos rates simplificados o Enterprise prices)
    // Para Geobooker Enterprise, usualmente se manejan precios fijos en USD.
    // Aquí podemos implementar una lógica de "Price Tiers" por país.

    const converted = amountInMXN * config.rate;

    return new Intl.NumberFormat(config.code === 'GBP' ? 'en-GB' : 'en-US', {
        style: 'currency',
        currency: config.code
    }).format(converted);
};

/**
 * Obtiene el símbolo de moneda actual
 */
export const getCurrencySymbol = () => {
    return getCurrencyConfig().symbol;
};
