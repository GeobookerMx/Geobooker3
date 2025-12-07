// src/hooks/useAdTracking.js
import { useEffect, useCallback } from 'react';
import { trackImpression, trackClick } from '../services/adService';

/**
 * Tracking de impresiones y clicks en anuncios
 * @param {string|number|null} campaignId
 * @param {boolean} autoTrackImpression
 * @param {Object} meta - info extra: { slot, position, page }
 */
export default function useAdTracking(campaignId, autoTrackImpression = true, meta = {}) {
  // Impresión automática
  useEffect(() => {
    if (!autoTrackImpression) return;
    if (!campaignId) return;

    try {
      trackImpression(campaignId, meta);
    } catch (err) {
      console.error('Error tracking impression', err);
    }
  }, [campaignId, autoTrackImpression, meta]);

  const handleClick = useCallback((url) => {
    if (!campaignId) {
      // si quieres, aún así podrías navegar:
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      trackClick(campaignId, url, meta);
    } catch (err) {
      console.error('Error tracking click', err);
      // como fallback, navega igual:
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [campaignId, meta]);

  const manualImpression = useCallback(() => {
    if (!campaignId) return;
    try {
      trackImpression(campaignId, meta);
    } catch (err) {
      console.error('Error tracking manual impression', err);
    }
  }, [campaignId, meta]);

  return {
    trackClick: handleClick,
    trackImpression: manualImpression
  };
}
