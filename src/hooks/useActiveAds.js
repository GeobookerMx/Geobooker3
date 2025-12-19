// src/hooks/useActiveAds.js
/**
 * Hook to fetch active ad campaigns based on user location
 * Used by HomePage to display relevant ads
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useActiveAds() {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);

    useEffect(() => {
        // Get user location from localStorage (set by geolocation on HomePage)
        const storedCity = localStorage.getItem('userCity');
        const storedCountry = localStorage.getItem('userCountry');

        setUserLocation({
            city: storedCity || 'unknown',
            country: storedCountry || 'unknown'
        });

        loadActiveAds(storedCity, storedCountry);
    }, []);

    const loadActiveAds = async (userCity, userCountry) => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Query active campaigns that match user's location
            let query = supabase
                .from('ad_campaigns')
                .select('*')
                .eq('status', 'active')
                .lte('start_date', today)
                .or(`end_date.gte.${today},end_date.is.null`);

            const { data, error } = await query;

            if (error) throw error;

            // Filter campaigns by user location
            const relevantAds = (data || []).filter(campaign => {
                // Global ads show everywhere
                if (campaign.ad_level === 'global') return true;

                // Country-level ads
                if (campaign.target_countries?.includes(userCountry)) return true;

                // City-level ads
                if (campaign.target_cities?.some(city =>
                    city.toLowerCase().includes(userCity?.toLowerCase() || '') ||
                    userCity?.toLowerCase()?.includes(city.toLowerCase())
                )) return true;

                return false;
            });

            // Sort by priority (global first, then country, then city)
            const sortedAds = relevantAds.sort((a, b) => {
                const priority = { global: 1, country: 2, city: 3 };
                return (priority[a.ad_level] || 4) - (priority[b.ad_level] || 4);
            });

            // Transform to AdBanner format
            const formattedAds = sortedAds.map(campaign => ({
                id: campaign.id,
                advertiser: campaign.advertiser_name,
                headline: campaign.headline || campaign.advertiser_name,
                description: campaign.description,
                imageUrl: campaign.creative_url || campaign.image_url,
                isVideo: campaign.creative_url?.match(/\.(mp4|webm|mov)$/i),
                ctaText: campaign.cta_text || 'Learn More',
                ctaUrl: campaign.cta_url || '#',
                adLevel: campaign.ad_level,
                targetCities: campaign.target_cities,
                targetCountries: campaign.target_countries
            }));

            setAds(formattedAds);

        } catch (error) {
            console.error('Error loading ads:', error);
            setAds([]);
        } finally {
            setLoading(false);
        }
    };

    // Refresh function
    const refresh = () => {
        const city = localStorage.getItem('userCity');
        const country = localStorage.getItem('userCountry');
        loadActiveAds(city, country);
    };

    return { ads, loading, userLocation, refresh };
}

export default useActiveAds;
