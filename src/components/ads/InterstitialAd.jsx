// src/components/ads/InterstitialAd.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useActiveCampaigns from '../../hooks/useActiveCampaigns';
import useAdTracking from '../../hooks/useAdTracking';
import ReportAdButton from './ReportAdButton';

/**
 * Anuncio Interstitial de pantalla completa
 * Frecuencia: 1 vez al día por usuario
 * Trigger: Después de la 5ta búsqueda del día
 * Tamaño: 800x600 (Desktop), Full mobile
 */
export default function InterstitialAd({ onClose }) {
    const [canClose, setCanClose] = useState(false);
    const [countdown, setCountdown] = useState(5);

    const { currentCampaign, hasCampaigns, loading } = useActiveCampaigns('interstitial');
    const { trackClick } = useAdTracking(currentCampaign?.id, true);

    // Countdown para habilitar el botón de cerrar
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanClose(true);
        }
    }, [countdown]);

    // Guardar que ya vio el interstitial hoy
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('lastInterstitialDate', today);
    }, []);

    if (loading || !hasCampaigns || !currentCampaign) {
        onClose?.();
        return null;
    }

    const creative = currentCampaign.ad_creatives?.[0];
    if (!creative) {
        onClose?.();
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            {/* Botón de cerrar */}
            {canClose ? (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all z-10"
                    aria-label="Cerrar anuncio"
                >
                    <X className="w-6 h-6 text-gray-900" />
                </button>
            ) : (
                <div className="absolute top-4 right-4 bg-white/90 text-gray-900 px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
                    Cerrar en {countdown}s
                </div>
            )}

            {/* Contenido del anuncio */}
            <div
                className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden cursor-pointer"
                onClick={() => !loading && trackClick(creative.cta_url)}
            >
                {/* Imagen principal */}
                {creative.image_url ? (
                    <div className="relative">
                        <img
                            src={creative.image_url}
                            alt={creative.title}
                            className="w-full h-auto max-h-[70vh] object-contain"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 md:p-20 text-center text-white">
                        <h1 className="text-4xl md:text-6xl font-bold mb-4">{creative.title}</h1>
                        {creative.description && (
                            <p className="text-xl md:text-2xl text-white/90">{creative.description}</p>
                        )}
                    </div>
                )}

                {/* Información y CTA */}
                <div className="p-6 md:p-8 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                {creative.title}
                            </h2>
                            {creative.description && (
                                <p className="text-gray-600 text-lg">
                                    {creative.description}
                                </p>
                            )}
                        </div>

                        <button
                            className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                            onClick={(e) => {
                                e.stopPropagation();
                                trackClick(creative.cta_url);
                            }}
                        >
                            {creative.cta_text || 'Ver oferta'}
                        </button>
                    </div>

                    {/* Anunciante */}
                    <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                        <span>Anuncio de {currentCampaign.advertiser_name}</span>
                        <div className="flex items-center gap-4">
                            <span className="text-xs">
                                {currentCampaign.geographic_scope === 'global'
                                    ? 'Disponible globalmente'
                                    : `Disponible en ${currentCampaign.target_location}`}
                            </span>
                            <ReportAdButton
                                campaignId={currentCampaign.id}
                                adSpaceType="interstitial"
                                variant="text"
                                className="text-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook para controlar cuándo mostrar el interstitial
 * Reglas: 1 vez al día, después de 5 búsquedas
 */
export function useInterstitialTrigger() {
    const [showInterstitial, setShowInterstitial] = useState(false);
    const [searchCount, setSearchCount] = useState(0);

    useEffect(() => {
        const count = parseInt(localStorage.getItem('searchCount') || '0');
        setSearchCount(count);
    }, []);

    const incrementSearchCount = () => {
        const newCount = searchCount + 1;
        setSearchCount(newCount);
        localStorage.setItem('searchCount', newCount.toString());

        // Verificar si ya vio interstitial hoy
        const today = new Date().toISOString().split('T')[0];
        const lastInterstitial = localStorage.getItem('lastInterstitialDate');

        // Mostrar interstitial si:
        // 1. Hizo 5 búsquedas
        // 2. No ha visto interstitial hoy
        if (newCount >= 5 && lastInterstitial !== today) {
            setShowInterstitial(true);
            // Resetear contador
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
