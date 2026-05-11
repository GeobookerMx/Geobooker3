// src/hooks/useGuestSearchLimit.js
/**
 * Hook para limitar búsquedas de usuarios invitados
 * 
 * 🎉 PERIODO DE LANZAMIENTO GRATUITO:
 * Hasta el 1 de marzo de 2026, TODOS los usuarios (incluidos invitados)
 * pueden buscar sin límite. Después de esa fecha, se activa el límite
 * de 1 búsqueda gratis para invitados.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GUEST_SEARCH_KEY = 'geobooker_guest_searches';
const MAX_GUEST_SEARCHES = 1;

// 🎉 Fecha límite del período de lanzamiento gratuito (1 de marzo 2026, medianoche CST)
const FREE_LAUNCH_END_DATE = new Date('2026-03-01T00:00:00-06:00');

// Helper: ¿Estamos en el período de lanzamiento gratuito?
const isFreeLaunchPeriod = () => new Date() < FREE_LAUNCH_END_DATE;

export const useGuestSearchLimit = () => {
    // ✅ Esperamos a que AuthContext termine de restaurar la sesión.
    // Antes, durante los primeros segundos `user` era null aunque el usuario sí
    // estuviera autenticado, y al buscar se disparaba el modal de login.
    const { user, loading } = useAuth();
    const [searchCount, setSearchCount] = useState(0);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    // 🎉 Durante el lanzamiento gratuito, no limitar a nadie
    const freeLaunch = isFreeLaunchPeriod();

    // Load search count from localStorage
    useEffect(() => {
        if (loading) return; // aún no sabemos si está logueado
        if (!user) {
            const stored = localStorage.getItem(GUEST_SEARCH_KEY);
            setSearchCount(stored ? parseInt(stored, 10) : 0);
        } else {
            // Reset for logged in users + limpiar contador legado en localStorage
            setSearchCount(0);
            localStorage.removeItem(GUEST_SEARCH_KEY);
        }
    }, [user, loading]);

    // Check if guest can search
    const canSearch = useCallback(() => {
        if (loading) return true; // mientras carga, no bloqueamos
        if (freeLaunch) return true; // 🎉 Lanzamiento gratuito: todos pueden buscar
        if (user) return true; // Logged in users can always search
        return searchCount < MAX_GUEST_SEARCHES;
    }, [user, loading, searchCount, freeLaunch]);

    // Increment search count for guests
    const recordSearch = useCallback(() => {
        if (loading) return; // no contar mientras AuthContext carga
        if (!user) {
            const newCount = searchCount + 1;
            setSearchCount(newCount);
            localStorage.setItem(GUEST_SEARCH_KEY, newCount.toString());

            // 🎉 Durante lanzamiento gratuito, NO mostrar prompt de login
            if (!freeLaunch && newCount >= MAX_GUEST_SEARCHES) {
                setShowLoginPrompt(true);
            }
        }
    }, [user, loading, searchCount, freeLaunch]);

    // Check and prompt for login if needed
    const checkAndPrompt = useCallback(() => {
        if (loading) return true; // permitir mientras carga
        if (freeLaunch) return true; // 🎉 Lanzamiento: siempre permitido
        if (!user && searchCount >= MAX_GUEST_SEARCHES) {
            setShowLoginPrompt(true);
            return false; // Cannot search
        }
        return true; // Can search
    }, [user, loading, searchCount, freeLaunch]);

    // Close prompt
    const closeLoginPrompt = useCallback(() => {
        setShowLoginPrompt(false);
    }, []);

    // Get remaining searches
    const remainingSearches = freeLaunch
        ? Infinity
        : (user ? Infinity : Math.max(0, MAX_GUEST_SEARCHES - searchCount));

    return {
        canSearch: canSearch(),
        recordSearch,
        checkAndPrompt,
        showLoginPrompt,
        closeLoginPrompt,
        remainingSearches,
        isGuest: !user,
        isFreeLaunch: freeLaunch,
    };
};

export default useGuestSearchLimit;
