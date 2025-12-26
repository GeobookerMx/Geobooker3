// src/hooks/useSessionTimeout.js
/**
 * Hook para cerrar sesión automáticamente después de inactividad
 * Solo aplica para usuarios con negocios registrados (seguridad adicional)
 */
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const SESSION_TIMEOUT_MINUTES = 30; // 30 minutos de inactividad

export const useSessionTimeout = () => {
    const { user, signOut } = useAuth();
    const timeoutRef = useRef(null);
    const hasBusinessRef = useRef(false);

    // Check if user has businesses
    const checkIfHasBusiness = useCallback(async () => {
        if (!user) {
            hasBusinessRef.current = false;
            return;
        }

        try {
            const { count } = await supabase
                .from('businesses')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', user.id);

            hasBusinessRef.current = (count || 0) > 0;
        } catch (error) {
            console.error('Error checking businesses:', error);
            hasBusinessRef.current = false;
        }
    }, [user]);

    // Logout function
    const handleTimeout = useCallback(async () => {
        if (hasBusinessRef.current && user) {
            toast('Tu sesión ha expirado por inactividad', {
                icon: '🔒',
                duration: 5000,
            });
            await signOut();
            window.location.href = '/login';
        }
    }, [user, signOut]);

    // Reset timer on activity
    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (user && hasBusinessRef.current) {
            timeoutRef.current = setTimeout(handleTimeout, SESSION_TIMEOUT_MINUTES * 60 * 1000);
        }
    }, [user, handleTimeout]);

    // Setup event listeners
    useEffect(() => {
        if (!user) return;

        checkIfHasBusiness();

        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

        const handleActivity = () => {
            resetTimer();
        };

        // Add listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true });
        });

        // Initial timer
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            activityEvents.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
        };
    }, [user, checkIfHasBusiness, resetTimer]);

    return null;
};

export default useSessionTimeout;
