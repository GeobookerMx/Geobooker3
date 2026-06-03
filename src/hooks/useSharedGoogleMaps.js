// src/hooks/useSharedGoogleMaps.js
/**
 * Hook compartido para Google Maps
 * Detecta si Maps ya fue cargado por index.html (__gmInit callback)
 * y evita cargarlo una segunda vez con useJsApiLoader.
 *
 * USO: const { isLoaded } = useSharedGoogleMaps();
 *
 * Reemplaza useJsApiLoader en todos los componentes secundarios.
 * El único punto de carga real sigue siendo index.html + BusinessMap.jsx.
 */
import { useState, useEffect } from 'react';

export function useSharedGoogleMaps() {
    const [isLoaded, setIsLoaded] = useState(
        // Si ya está cargado al momento del hook, devolver true de inmediato
        typeof window !== 'undefined' &&
        (window.__gmReady === true || (window.google && window.google.maps))
    );

    useEffect(() => {
        // Si ya estaba listo, no hacemos nada
        if (isLoaded) return;

        // Polling cada 100ms hasta que Maps esté disponible (máx 10s)
        let attempts = 0;
        const maxAttempts = 100;

        const interval = setInterval(() => {
            attempts++;
            const ready = window.__gmReady === true || (window.google && window.google.maps);

            if (ready) {
                setIsLoaded(true);
                clearInterval(interval);
            } else if (attempts >= maxAttempts) {
                console.warn('[useSharedGoogleMaps] Google Maps no cargó en 10s');
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isLoaded]);

    return { isLoaded };
}
