// src/hooks/useActiveCampaigns.js
import { useState, useEffect } from 'react';
import { loadActiveCampaigns } from '../services/adService';

/**
 * Hook para cargar campañas activas de un espacio publicitario
 * @param {string} spaceName - Nombre del espacio ('hero_banner', 'featured_carousel', etc.)
 * @param {Object} options
 *  - autoRotate: boolean
 *  - rotationInterval: ms
 *  - filters: { country, city, category, deviceTypeOverride, languageOverride }
 *  - userContext: { userId, country, city, locale }
 */
export default function useActiveCampaigns(spaceName, options = {}) {
  const {
    autoRotate = false,
    rotationInterval = 10000,
    filters = {},
    userContext = {}
  } = options;

  const [campaigns, setCampaigns] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!spaceName) return;

    let isCancelled = false;

    async function fetchCampaigns() {
      try {
        setLoading(true);

        const context = {
          // idioma: si hay override o viene del userContext, si no, browser
          language:
            filters.languageOverride ||
            userContext.locale ||
            navigator.language,

          // tipo de dispositivo: override -> mobile/desktop por width
          deviceType:
            filters.deviceTypeOverride ||
            (window.innerWidth < 768 ? 'mobile' : 'desktop'),

          // geografía: tomamos prioridad de userContext, después filtros
          country: userContext.country || filters.country || null,
          city: userContext.city || filters.city || null,

          // extra opcional para analytics
          userId: userContext.userId || null
        };

        const data = await loadActiveCampaigns(spaceName, context);

        if (isCancelled) return;

        let filteredData = data || [];

        // Filtrado adicional por categoría si es necesario (post-fetch)
        if (filters.category) {
          filteredData = filteredData.filter(campaign =>
            !campaign.target_category ||
            campaign.target_category === filters.category
          );
        }

        setCampaigns(filteredData);
        setError(null);
        setCurrentIndex(0); // siempre reset al recargar
      } catch (err) {
        if (isCancelled) return;
        console.error('Error loading campaigns:', err);
        setError(err);
        setCampaigns([]);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchCampaigns();

    return () => {
      isCancelled = true;
    };
  }, [
    spaceName,
    filters.country,
    filters.city,
    filters.category,
    filters.languageOverride,
    filters.deviceTypeOverride,
    userContext.country,
    userContext.city,
    userContext.locale,
    userContext.userId
  ]);

  // Rotación automática
  useEffect(() => {
    if (!autoRotate || campaigns.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % campaigns.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, campaigns.length, rotationInterval]);

  const nextCampaign = () => {
    if (campaigns.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % campaigns.length);
  };

  const prevCampaign = () => {
    if (campaigns.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + campaigns.length) % campaigns.length);
  };

  const goToCampaign = (index) => {
    if (index >= 0 && index < campaigns.length) {
      setCurrentIndex(index);
    }
  };

  return {
    campaigns,
    currentCampaign: campaigns[currentIndex] || null,
    currentIndex,
    loading,
    error,
    hasCampaigns: campaigns.length > 0,
    nextCampaign,
    prevCampaign,
    goToCampaign
  };
}
