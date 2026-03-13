// src/services/denueMapService.js
import { supabase } from '../lib/supabase';

/**
 * Fetches businesses within a bounding box (viewport) using PostGIS
 * @param {number} minLat South West Latitude
 * @param {number} minLng South West Longitude
 * @param {number} maxLat North East Latitude
 * @param {number} maxLng North East Longitude
 * @param {number} limit Maximum number of results to prevent overwhelming the browser
 * @returns {Promise<Array>} List of businesses
 */
export const getBusinessesInBounds = async (minLat, minLng, maxLat, maxLng, limit = 500) => {
    try {
        const { data, error } = await supabase.rpc('businesses_in_bounds', {
            south: minLat,
            west: minLng,
            north: maxLat,
            east: maxLng,
            p_limit: limit
        });

        if (error) {
            console.error('Error fetching businesses in bounds via RPC:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching businesses:', err);
        return [];
    }
};
