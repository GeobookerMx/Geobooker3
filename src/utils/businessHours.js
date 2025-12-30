// src/utils/businessHours.js
/**
 * Utilidades para verificar si un negocio está abierto
 * Trabaja con el campo opening_hours JSONB de la tabla businesses
 */

// Mapeo de días en español e inglés
const DAY_NAMES = {
    0: ['domingo', 'sunday', 'sun', 'dom'],
    1: ['lunes', 'monday', 'mon', 'lun'],
    2: ['martes', 'tuesday', 'tue', 'mar'],
    3: ['miércoles', 'miercoles', 'wednesday', 'wed', 'mie'],
    4: ['jueves', 'thursday', 'thu', 'jue'],
    5: ['viernes', 'friday', 'fri', 'vie'],
    6: ['sábado', 'sabado', 'saturday', 'sat', 'sab']
};

/**
 * Verifica si un negocio está abierto ahora
 * @param {Object} openingHours - Objeto JSONB con horarios
 * @param {Date} date - Fecha/hora a verificar (por defecto: ahora)
 * @returns {Object} { isOpen, nextChange, currentHours }
 */
export function isBusinessOpen(openingHours, date = new Date()) {
    if (!openingHours || typeof openingHours !== 'object') {
        return { isOpen: null, reason: 'no_hours' };
    }

    const dayOfWeek = date.getDay();
    const currentTime = formatTime(date.getHours(), date.getMinutes());

    // Buscar los horarios del día actual
    const todayHours = findTodayHours(openingHours, dayOfWeek);

    if (!todayHours) {
        return { isOpen: false, reason: 'closed_today' };
    }

    // Verificar si está dentro del horario
    const { open, close } = todayHours;

    if (!open || !close) {
        return { isOpen: null, reason: 'incomplete_hours' };
    }

    const isOpen = isTimeInRange(currentTime, open, close);

    return {
        isOpen,
        reason: isOpen ? 'open' : 'outside_hours',
        openTime: open,
        closeTime: close,
        nextChange: isOpen ? close : findNextOpenTime(openingHours, dayOfWeek)
    };
}

/**
 * Busca los horarios del día actual en el objeto de horarios
 */
function findTodayHours(openingHours, dayOfWeek) {
    const dayNames = DAY_NAMES[dayOfWeek];

    // Buscar por nombre del día (español o inglés)
    for (const name of dayNames) {
        if (openingHours[name]) {
            return openingHours[name];
        }
        // También buscar con mayúscula inicial
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
        if (openingHours[capitalized]) {
            return openingHours[capitalized];
        }
    }

    // Buscar por índice numérico (0-6)
    if (openingHours[dayOfWeek] || openingHours[String(dayOfWeek)]) {
        return openingHours[dayOfWeek] || openingHours[String(dayOfWeek)];
    }

    return null;
}

/**
 * Formatea hora en formato HH:MM
 */
function formatTime(hours, minutes) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Parsea una hora en formato string a minutos desde medianoche
 */
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
}

/**
 * Verifica si una hora está dentro de un rango
 */
function isTimeInRange(current, open, close) {
    const currentMins = parseTimeToMinutes(current);
    const openMins = parseTimeToMinutes(open);
    const closeMins = parseTimeToMinutes(close);

    if (currentMins === null || openMins === null || closeMins === null) {
        return null;
    }

    // Manejar horarios que cruzan medianoche (ej: 22:00 - 02:00)
    if (closeMins < openMins) {
        return currentMins >= openMins || currentMins < closeMins;
    }

    return currentMins >= openMins && currentMins < closeMins;
}

/**
 * Encuentra la próxima hora de apertura
 */
function findNextOpenTime(openingHours, currentDay) {
    for (let i = 1; i <= 7; i++) {
        const nextDay = (currentDay + i) % 7;
        const hours = findTodayHours(openingHours, nextDay);
        if (hours?.open) {
            const dayName = DAY_NAMES[nextDay][0]; // nombre en español
            return `${dayName} ${hours.open}`;
        }
    }
    return null;
}

/**
 * Formatea el estado de apertura para mostrar
 */
export function formatOpenStatus(openingHours) {
    const result = isBusinessOpen(openingHours);

    if (result.isOpen === null) {
        return { text: 'Horario no disponible', color: 'gray', icon: '❓' };
    }

    if (result.isOpen) {
        return {
            text: `Abierto · Cierra ${result.closeTime}`,
            color: 'green',
            icon: '🟢'
        };
    }

    if (result.reason === 'closed_today') {
        return { text: 'Cerrado hoy', color: 'red', icon: '🔴' };
    }

    return {
        text: result.nextChange ? `Cerrado · Abre ${result.nextChange}` : 'Cerrado',
        color: 'red',
        icon: '🔴'
    };
}

export default isBusinessOpen;
