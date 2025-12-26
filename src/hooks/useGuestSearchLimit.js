// src/hooks/useGuestSearchLimit.js
/**
 * Hook para limitar búsquedas de usuarios invitados
 * Permite 1 búsqueda gratis, luego requiere login
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GUEST_SEARCH_KEY = 'geobooker_guest_searches';
const MAX_GUEST_SEARCHES = 1;

export const useGuestSearchLimit = () => {
    const { user } = useAuth();
    const [searchCount, setSearchCount] = useState(0);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    // Load search count from localStorage
    useEffect(() => {
        if (!user) {
            const stored = localStorage.getItem(GUEST_SEARCH_KEY);
            setSearchCount(stored ? parseInt(stored, 10) : 0);
        } else {
            // Reset for logged in users
            setSearchCount(0);
        }
    }, [user]);

    // Check if guest can search
    const canSearch = useCallback(() => {
        if (user) return true; // Logged in users can always search
        return searchCount < MAX_GUEST_SEARCHES;
    }, [user, searchCount]);

    // Increment search count for guests
    const recordSearch = useCallback(() => {
        if (!user) {
            const newCount = searchCount + 1;
            setSearchCount(newCount);
            localStorage.setItem(GUEST_SEARCH_KEY, newCount.toString());

            // Show login prompt if they've used their free search
            if (newCount >= MAX_GUEST_SEARCHES) {
                setShowLoginPrompt(true);
            }
        }
    }, [user, searchCount]);

    // Check and prompt for login if needed
    const checkAndPrompt = useCallback(() => {
        if (!user && searchCount >= MAX_GUEST_SEARCHES) {
            setShowLoginPrompt(true);
            return false; // Cannot search
        }
        return true; // Can search
    }, [user, searchCount]);

    // Close prompt
    const closeLoginPrompt = useCallback(() => {
        setShowLoginPrompt(false);
    }, []);

    // Get remaining searches
    const remainingSearches = user ? Infinity : Math.max(0, MAX_GUEST_SEARCHES - searchCount);

    return {
        canSearch: canSearch(),
        recordSearch,
        checkAndPrompt,
        showLoginPrompt,
        closeLoginPrompt,
        remainingSearches,
        isGuest: !user,
    };
};

export default useGuestSearchLimit;
