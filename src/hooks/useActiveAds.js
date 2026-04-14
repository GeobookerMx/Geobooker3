// src/hooks/useActiveAds.js
/**
 * Hook to fetch active ad campaigns based on user location
 * Optimizaciones: AbortController, caché localStorage (5 min stale), campo imagen correcto
 */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AD_CACHE_KEY = 'geobooker_active_ads_cache';
const AD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCachedAds(city, country) {
    try {
        const raw = localStorage.getItem(AD_CACHE_KEY);
        if (!raw) return null;
        const { data, timestamp, city: cachedCity, country: cachedCountry } = JSON.parse(raw);
        const isExpired = Date.now() - timestamp > AD_CACHE_TTL_MS;
        const isSameLocation = cachedCity === city && cachedCountry === country;
        if (!isExpired && isSameLocation) return data;
    } catch (_) {}
    return null;
}

function setCachedAds(city, country, data) {
    try {
        localStorage.setItem(AD_CACHE_KEY, JSON.stringify({
            data, timestamp: Date.now(), city, country
        }));
    } catch (_) {}
}

export function useActiveAds() {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const abortRef = useRef(null);

    useEffect(() => {
        const storedCity = localStorage.getItem('userCity') || 'unknown';
        const storedCountry = localStorage.getItem('userCountry') || 'unknown';

        setUserLocation({ city: storedCity, country: storedCountry });

        // Revisar caché primero — evita hit a Supabase si los datos son frescos
        const cached = getCachedAds(storedCity, storedCountry);
        if (cached) {
            setAds(cached);
            setLoading(false);
            return;
        }

        loadActiveAds(storedCity, storedCountry);

        // Limpiar AbortController al desmontar
        return () => { if (abortRef.current) abortRef.current.abort(); };
    }, []);

    const loadActiveAds = async (userCity, userCountry) => {
        // Cancelar fetch anterior si existe
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('ad_campaigns')
                .select('*')
                .eq('status', 'active')
                .lte('start_date', today)
                .or(`end_date.gte.${today},end_date.is.null`);

            if (error) throw error;
            if (abortRef.current?.signal.aborted) return; // Componente desmontado

            // Filtrar por ubicación
            const relevantAds = (data || []).filter(campaign => {
                if (campaign.ad_level === 'global') return true;
                if (campaign.target_countries?.includes(userCountry)) return true;
                if (campaign.target_cities?.some(city =>
                    city.toLowerCase().includes(userCity?.toLowerCase() || '') ||
                    userCity?.toLowerCase()?.includes(city.toLowerCase())
                )) return true;
                return false;
            });

            // Ordenar por prioridad
            const sortedAds = relevantAds.sort((a, b) => {
                const priority = { global: 1, country: 2, city: 3 };
                return (priority[a.ad_level] || 4) - (priority[b.ad_level] || 4);
            });

            // Transformar al formato esperado por AdBanner
            // FIX: imagen usa image_url como campo principal (creative_url era incorrecto)
            const formattedAds = sortedAds.map(campaign => ({
                id: campaign.id,
                advertiser: campaign.advertiser_name,
                headline: campaign.headline || campaign.advertiser_name,
                description: campaign.description,
                imageUrl: campaign.image_url || campaign.creative_url || null,
                isVideo: campaign.image_url?.match(/\.(mp4|webm|mov)$/i),
                ctaText: campaign.cta_text || 'Más información',
                ctaUrl: campaign.cta_url || '#',
                adLevel: campaign.ad_level,
                targetCities: campaign.target_cities,
                targetCountries: campaign.target_countries
            }));

            setCachedAds(userCity, userCountry, formattedAds);
            setAds(formattedAds);

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading ads:', error);
                setAds([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => {
        localStorage.removeItem(AD_CACHE_KEY); // Limpiar caché al refrescar manualmente
        const city = localStorage.getItem('userCity') || 'unknown';
        const country = localStorage.getItem('userCountry') || 'unknown';
        loadActiveAds(city, country);
    };

    return { ads, loading, userLocation, refresh };
}

export default useActiveAds;
