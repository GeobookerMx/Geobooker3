/**
 * Constantes centralizadas para CRM y Marketing
 * src/constants/crmConstants.js
 */

// ============================================
// CÓDIGOS DE PAÍS PARA NORMALIZACIÓN
// ============================================

// Países de habla inglesa (código +1 para USA/Canadá)
export const ENGLISH_SPEAKING_COUNTRY_CODES = {
    '+1': 'en',    // USA y Canadá
    '+44': 'en',   // Reino Unido
    '+61': 'en',   // Australia
    '+64': 'en',   // Nueva Zelanda
    '+353': 'en',  // Irlanda
    '+27': 'en',   // Sudáfrica
};

// Países de habla hispana
export const SPANISH_SPEAKING_COUNTRY_CODES = {
    '+52': 'es',   // México
    '+34': 'es',   // España
    '+54': 'es',   // Argentina
    '+56': 'es',   // Chile
    '+57': 'es',   // Colombia
    '+51': 'es',   // Perú
    '+58': 'es',   // Venezuela
    '+593': 'es',  // Ecuador
    '+502': 'es',  // Guatemala
    '+506': 'es',  // Costa Rica
    '+507': 'es',  // Panamá
};

// Códigos de área de USA/Canadá (para detectar números de 10 dígitos)
// Nota: Si un número de 10 dígitos empieza con alguno de estos, es +1
export const USA_CANADA_AREA_CODES = [
    // Texas
    '214', '469', '972', '713', '281', '832', '346', '512', '737', '210', '726',
    '956', '361', '806', '817', '915', '940', '254',
    // California
    '213', '310', '323', '408', '415', '510', '619', '626', '650', '707', '714',
    '818', '831', '858', '909', '916', '925', '949', '951',
    // Florida
    '305', '321', '352', '386', '407', '561', '727', '754', '772', '786', '813',
    '850', '863', '904', '941', '954',
    // New York
    '212', '315', '347', '516', '518', '585', '607', '631', '646', '716', '718',
    '845', '914', '917', '929',
    // Otros estados importantes
    '202', '206', '215', '216', '267', '312', '330', '404', '412', '414', '425',
    '480', '502', '503', '520', '602', '614', '617', '630', '702', '703', '704',
    '720', '770', '773', '801', '847', '919', '971', '972',
    // Canadá
    '416', '437', '647', '905', '289', '604', '778', '250', '403', '587', '780',
    '306', '204', '514', '438', '450', '613', '343', '902', '709',
];

// Códigos de área de UK (para detectar números de 10-11 dígitos)
export const UK_AREA_CODES = [
    '020', '021', '028', '029', '0113', '0114', '0115', '0116', '0117', '0118',
    '0121', '0131', '0141', '0151', '0161', '0171', '0181', '0191',
    '07', // Móviles UK
];

// ============================================
// CIUDADES PREDEFINIDAS (SCAN & INVITE)
// ============================================
export const PREDEFINED_CITIES = [
    // Ubicación actual
    { id: 'auto', name: '📍 Mi ubicación actual', lat: null, lng: null, group: 'actual' },

    // CDMX - Colonias de Alta Densidad
    { id: 'cdmx_centro', name: 'CDMX - Centro Histórico', lat: 19.4326, lng: -99.1332, group: 'cdmx' },
    { id: 'cdmx_roma', name: 'CDMX - Roma Norte', lat: 19.4195, lng: -99.1617, group: 'cdmx' },
    { id: 'cdmx_condesa', name: 'CDMX - Condesa', lat: 19.4111, lng: -99.1747, group: 'cdmx' },
    { id: 'cdmx_polanco', name: 'CDMX - Polanco', lat: 19.4335, lng: -99.1917, group: 'cdmx' },
    { id: 'cdmx_del_valle', name: 'CDMX - Del Valle', lat: 19.3908, lng: -99.1614, group: 'cdmx' },
    { id: 'cdmx_narvarte', name: 'CDMX - Narvarte', lat: 19.3989, lng: -99.1499, group: 'cdmx' },
    { id: 'cdmx_coyoacan', name: 'CDMX - Coyoacán', lat: 19.3467, lng: -99.1617, group: 'cdmx' },
    { id: 'cdmx_santa_fe', name: 'CDMX - Santa Fe', lat: 19.3590, lng: -99.2594, group: 'cdmx' },
    { id: 'cdmx_doctores', name: 'CDMX - Doctores', lat: 19.4167, lng: -99.1417, group: 'cdmx' },
    { id: 'cdmx_napoles', name: 'CDMX - Nápoles', lat: 19.3944, lng: -99.1778, group: 'cdmx' },
    { id: 'cdmx_insurgentes', name: 'CDMX - Insurgentes Sur', lat: 19.3800, lng: -99.1789, group: 'cdmx' },

    // Otras Ciudades Grandes
    { id: 'guadalajara', name: 'Guadalajara - Centro', lat: 20.6597, lng: -103.3496, group: 'grandes' },
    { id: 'guadalajara_chapu', name: 'Guadalajara - Chapalita', lat: 20.6700, lng: -103.4025, group: 'grandes' },
    { id: 'monterrey', name: 'Monterrey - Centro', lat: 25.6866, lng: -100.3161, group: 'grandes' },
    { id: 'monterrey_sanpedro', name: 'Monterrey - San Pedro', lat: 25.6580, lng: -100.4029, group: 'grandes' },
    { id: 'puebla', name: 'Puebla - Centro', lat: 19.0414, lng: -98.2063, group: 'grandes' },
    { id: 'queretaro', name: 'Querétaro - Centro', lat: 20.5888, lng: -100.3899, group: 'grandes' },

    // Ciudades Turísticas
    { id: 'cancun', name: 'Cancún - Zona Hotelera', lat: 21.1619, lng: -86.8515, group: 'turisticas' },
    { id: 'playa_carmen', name: 'Playa del Carmen', lat: 20.6296, lng: -87.0739, group: 'turisticas' },
    { id: 'merida', name: 'Mérida - Centro', lat: 20.9674, lng: -89.5926, group: 'turisticas' },
    { id: 'vallarta', name: 'Puerto Vallarta', lat: 20.6534, lng: -105.2253, group: 'turisticas' },
    { id: 'los_cabos', name: 'Los Cabos', lat: 23.0548, lng: -109.6975, group: 'turisticas' },

    // Norte de México
    { id: 'tijuana', name: 'Tijuana - Centro', lat: 32.5149, lng: -117.0382, group: 'norte' },
    { id: 'chihuahua', name: 'Chihuahua - Centro', lat: 28.6353, lng: -106.0889, group: 'norte' },
    { id: 'hermosillo', name: 'Hermosillo - Centro', lat: 29.0729, lng: -110.9559, group: 'norte' },

    // Bajío
    { id: 'leon', name: 'León - Centro', lat: 21.1221, lng: -101.6860, group: 'bajio' },
    { id: 'aguascalientes', name: 'Aguascalientes - Centro', lat: 21.8853, lng: -102.2916, group: 'bajio' },
    { id: 'san_luis', name: 'San Luis Potosí', lat: 22.1565, lng: -100.9855, group: 'bajio' },
    { id: 'morelia', name: 'Morelia - Centro', lat: 19.7059, lng: -101.1949, group: 'bajio' },

    // Manual
    { id: 'custom', name: '✏️ Ingresar coordenadas', lat: null, lng: null, group: 'manual' },
];

// ============================================
// REGIONES GLOBALES (APIFY SCRAPER)
// ============================================
export const GLOBAL_REGIONS = [
    {
        continent: '🇲🇽 México',
        cities: [
            'Ciudad de México, México', 'Guadalajara, Jalisco, México', 'Monterrey, Nuevo León, México',
            'Cancún, Quintana Roo, México', 'Puebla, México', 'Tijuana, Baja California, México',
            'León, Guanajuato, México', 'Mérida, Yucatán, México', 'Querétaro, México',
        ]
    },
    {
        continent: '🇺🇸 Estados Unidos',
        cities: [
            'Miami, Florida, USA', 'Los Angeles, California, USA', 'Houston, Texas, USA',
            'New York, NY, USA', 'Chicago, Illinois, USA', 'Dallas, Texas, USA',
            'Phoenix, Arizona, USA', 'San Antonio, Texas, USA', 'San Diego, California, USA',
            'Las Vegas, Nevada, USA', 'Denver, Colorado, USA', 'Austin, Texas, USA'
        ]
    },
    {
        continent: '🇬🇧 Reino Unido',
        cities: [
            'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Liverpool, UK',
            'Edinburgh, Scotland, UK', 'Glasgow, Scotland, UK', 'Bristol, UK', 'Leeds, UK'
        ]
    },
    {
        continent: '🇨🇦 Canadá',
        cities: [
            'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada',
            'Calgary, Canada', 'Ottawa, Canada', 'Edmonton, Canada'
        ]
    },
    {
        continent: '🇪🇺 Europa',
        cities: [
            'Madrid, España', 'Barcelona, España', 'Paris, France',
            'Berlin, Germany', 'Rome, Italy', 'Amsterdam, Netherlands', 'Lisbon, Portugal',
        ]
    },
    {
        continent: '🌎 Latinoamérica',
        cities: [
            'Buenos Aires, Argentina', 'Bogotá, Colombia', 'São Paulo, Brazil',
            'Lima, Peru', 'Santiago, Chile', 'Medellín, Colombia',
            'Cartagena, Colombia', 'Panama City, Panama', 'San José, Costa Rica'
        ]
    },
    {
        continent: '🌏 Asia y Oceanía',
        cities: [
            'Sydney, Australia', 'Melbourne, Australia', 'Auckland, New Zealand',
            'Singapore', 'Dubai, UAE', 'Hong Kong', 'Tokyo, Japan'
        ]
    },
];

// ============================================
// CATEGORÍAS DE NEGOCIOS
// ============================================
export const BUSINESS_CATEGORIES = [
    { id: 'restaurant', label: '🍽️ Restaurantes', checked: true },
    { id: 'store', label: '🏪 Tiendas', checked: true },
    { id: 'cafe', label: '☕ Cafeterías', checked: true },
    { id: 'pharmacy', label: '💊 Farmacias', checked: true },
    { id: 'hair_care', label: '💇 Salones de Belleza', checked: true },
    { id: 'car_repair', label: '🔧 Talleres Mecánicos', checked: true },
    { id: 'gym', label: '🏋️ Gimnasios', checked: false },
    { id: 'dentist', label: '🦷 Dentistas', checked: false },
    { id: 'doctor', label: '🏥 Clínicas/Doctores', checked: false },
    { id: 'veterinary_care', label: '🐾 Veterinarias', checked: false },
    { id: 'hotel', label: '🏨 Hoteles', checked: false },
    { id: 'bar', label: '🍺 Bares', checked: false },
    { id: 'bakery', label: '🥐 Panaderías', checked: false },
    { id: 'laundry', label: '🧺 Lavanderías', checked: false },
    { id: 'real_estate_agency', label: '🏠 Inmobiliarias', checked: false },
    { id: 'insurance_agency', label: '📋 Aseguradoras', checked: false },
];

// ============================================
// LÍMITES Y CONFIGURACIÓN
// ============================================
export const WHATSAPP_LIMITS = {
    NATIONAL_DAILY: 10,   // Scan & Invite (México)
    GLOBAL_DAILY: 10,     // Apify Scraper (Internacional)
    TOTAL_DAILY: 20,      // Total máximo por día
};

export const EMAIL_LIMITS = {
    DAILY_DEFAULT: 100,
    MAX_PER_HOUR: 50,
};

// Hora de reinicio de contadores (medianoche UTC)
// Nota: Los contadores usan new Date().toISOString().split('T')[0]
// Esto significa que se reinician a:
// - 00:00 UTC = 18:00 del día anterior en México (CST -6)
// - 00:00 UTC = 19:00 del día anterior en México (CDT -5, horario de verano)
export const COUNTER_RESET_INFO = {
    timezone: 'UTC',
    resetTime: '00:00:00',
    mexicoOffsetCT: -6,    // Central Time (invierno)
    mexicoCDT: -5,         // Central Daylight Time (verano)
};
