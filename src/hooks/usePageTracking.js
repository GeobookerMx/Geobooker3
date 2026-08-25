// src/hooks/usePageTracking.js
/**
 * Hook para tracking automático de páginas
 * Se activa cada vez que cambia la ruta
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analyticsService';
import { metaPageView } from '../lib/metaPixel';

export function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        // Pequeño delay para asegurar que el título esté actualizado
        const timer = setTimeout(() => {
            trackPageView(location.pathname, document.title);
            metaPageView();
        }, 100);

        return () => clearTimeout(timer);
    }, [location.pathname, location.search]);
}

export default usePageTracking;
