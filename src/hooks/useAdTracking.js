// src/hooks/useAdTracking.js
import { useEffect, useCallback, useRef } from 'react';
import { trackImpression, trackClick } from '../services/adService';

const EMPTY_META = Object.freeze({});
const IMPRESSION_COOLDOWN_MS = 30_000;

function canRecordImpression(campaignId, slot) {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;

  try {
    const key = `gb_ad_impression:${slot || 'default'}:${campaignId}`;
    const lastRecordedAt = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - lastRecordedAt < IMPRESSION_COOLDOWN_MS) return false;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // En navegadores con storage restringido seguimos registrando la impresion.
  }

  return true;
}

/**
 * Tracking de impresiones y clicks en anuncios
 * @param {string|number|null} campaignId
 * @param {boolean} autoTrackImpression
 * @param {Object} meta - info extra: { slot, position, page }
 */
export default function useAdTracking(campaignId, autoTrackImpression = true, meta = EMPTY_META) {
  const metaRef = useRef(meta);
  metaRef.current = meta;

  // Impresión automática
  useEffect(() => {
    if (!autoTrackImpression) return;
    if (!campaignId) return;

    if (!canRecordImpression(campaignId, metaRef.current?.slot)) return;

    try {
      trackImpression(campaignId, metaRef.current);
    } catch (err) {
      console.error('Error tracking impression', err);
    }
  }, [campaignId, autoTrackImpression]);

  const handleClick = useCallback((url) => {
    if (!campaignId) {
      // si quieres, aún así podrías navegar:
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      trackClick(campaignId, url, metaRef.current);
    } catch (err) {
      console.error('Error tracking click', err);
      // como fallback, navega igual:
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [campaignId]);

  const manualImpression = useCallback(() => {
    if (!campaignId) return;
    try {
      trackImpression(campaignId, metaRef.current);
    } catch (err) {
      console.error('Error tracking manual impression', err);
    }
  }, [campaignId]);

  return {
    trackClick: handleClick,
    trackImpression: manualImpression
  };
}
