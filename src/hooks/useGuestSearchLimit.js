// src/hooks/useGuestSearchLimit.js
/**
 * Hook para invitar a usuarios invitados a crear cuenta sin bloquear busquedas.
 * Durante lanzamiento 2026 Geobooker conserva busqueda abierta, pero muestra
 * una invitacion inteligente despues de varias busquedas reales.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GUEST_SEARCH_KEY = 'geobooker_guest_searches';
const GUEST_PROMPT_KEY = 'geobooker_guest_login_prompt_last_seen';
const MAX_GUEST_SEARCHES = 1;
const SOFT_PROMPT_AFTER_SEARCHES = 2;
const PROMPT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

const FREE_LAUNCH_END_DATE = new Date('2026-12-31T23:59:59-06:00');
const isFreeLaunchPeriod = () => new Date() < FREE_LAUNCH_END_DATE;

function shouldShowSoftPrompt(nextCount) {
    if (nextCount < SOFT_PROMPT_AFTER_SEARCHES) return false;

    const lastSeen = Number(localStorage.getItem(GUEST_PROMPT_KEY) || 0);
    return !lastSeen || Date.now() - lastSeen > PROMPT_COOLDOWN_MS;
}

export const useGuestSearchLimit = () => {
    const { user, loading } = useAuth();
    const [searchCount, setSearchCount] = useState(0);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    const freeLaunch = isFreeLaunchPeriod();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            const stored = localStorage.getItem(GUEST_SEARCH_KEY);
            setSearchCount(stored ? parseInt(stored, 10) : 0);
        } else {
            setSearchCount(0);
            localStorage.removeItem(GUEST_SEARCH_KEY);
            localStorage.removeItem(GUEST_PROMPT_KEY);
        }
    }, [user, loading]);

    const canSearch = useCallback(() => {
        if (loading) return true;
        if (freeLaunch) return true;
        if (user) return true;
        return searchCount < MAX_GUEST_SEARCHES;
    }, [user, loading, searchCount, freeLaunch]);

    const recordSearch = useCallback(() => {
        if (loading || user) return;

        setSearchCount((currentCount) => {
            const nextCount = currentCount + 1;
            localStorage.setItem(GUEST_SEARCH_KEY, nextCount.toString());

            if (freeLaunch) {
                if (shouldShowSoftPrompt(nextCount)) {
                    setShowLoginPrompt(true);
                    localStorage.setItem(GUEST_PROMPT_KEY, Date.now().toString());
                }
            } else if (nextCount >= MAX_GUEST_SEARCHES) {
                setShowLoginPrompt(true);
                localStorage.setItem(GUEST_PROMPT_KEY, Date.now().toString());
            }

            return nextCount;
        });
    }, [user, loading, freeLaunch]);

    const checkAndPrompt = useCallback(() => {
        if (loading) return true;
        if (freeLaunch) return true;
        if (!user && searchCount >= MAX_GUEST_SEARCHES) {
            setShowLoginPrompt(true);
            localStorage.setItem(GUEST_PROMPT_KEY, Date.now().toString());
            return false;
        }
        return true;
    }, [user, loading, searchCount, freeLaunch]);

    const closeLoginPrompt = useCallback(() => {
        setShowLoginPrompt(false);
    }, []);

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
