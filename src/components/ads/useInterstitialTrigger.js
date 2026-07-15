import { useState, useEffect } from 'react';

/**
 * Hook para controlar cuando mostrar el interstitial
 * Reglas: 1 vez al dia, despues de 5 busquedas
 */
export default function useInterstitialTrigger() {
    const [showInterstitial, setShowInterstitial] = useState(false);
    const [searchCount, setSearchCount] = useState(0);

    useEffect(() => {
        const count = parseInt(localStorage.getItem('searchCount') || '0', 10);
        setSearchCount(count);
    }, []);

    const incrementSearchCount = () => {
        const newCount = searchCount + 1;
        setSearchCount(newCount);
        localStorage.setItem('searchCount', newCount.toString());

        const today = new Date().toISOString().split('T')[0];
        const lastInterstitial = localStorage.getItem('lastInterstitialDate');

        if (newCount >= 5 && lastInterstitial !== today) {
            setShowInterstitial(true);
            localStorage.setItem('searchCount', '0');
            setSearchCount(0);
        }
    };

    const closeInterstitial = () => {
        setShowInterstitial(false);
    };

    return {
        showInterstitial,
        incrementSearchCount,
        closeInterstitial
    };
}
