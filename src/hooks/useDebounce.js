// src/hooks/useDebounce.js
/**
 * Hook para debounce de valores y callbacks
 * Útil para evitar spam de queries al mover el mapa
 */
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce de un valor
 * @param {any} value - Valor a debounce
 * @param {number} delay - Delay en ms (default: 500)
 * @returns {any} - Valor debounceado
 */
export function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounce de un callback
 * @param {Function} callback - Función a debounce
 * @param {number} delay - Delay en ms (default: 500)
 * @returns {Function} - Callback debounceado
 */
export function useDebouncedCallback(callback, delay = 500) {
    const timeoutRef = useRef(null);
    const callbackRef = useRef(callback);

    // Mantener referencia actualizada del callback
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}

/**
 * Cache simple para resultados de queries
 */
const queryCache = new Map();
const CACHE_TTL = 60000; // 60 segundos

export function getCachedQuery(key) {
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('📦 Cache hit:', key);
        return cached.data;
    }
    return null;
}

export function setCachedQuery(key, data) {
    queryCache.set(key, { data, timestamp: Date.now() });
    console.log('💾 Cached:', key);
}

export function clearQueryCache() {
    queryCache.clear();
    console.log('🗑️ Cache cleared');
}

export default useDebounce;
