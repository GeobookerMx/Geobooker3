// src/components/ads/StickyBanner.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import useActiveCampaigns from '../../hooks/useActiveCampaigns';
import useAdTracking from '../../hooks/useAdTracking';

/**
 * Banner inferior pegajoso (Segunda Plana)
 * Ubicación: Footer sticky, siempre visible
 * Tamaño: 728x90 (Desktop), 320x50 (Mobile)
 */
export default function StickyBanner() {
    const [isVisible, setIsVisible] = useState(true);

    const { currentCampaign, hasCampaigns, loading } = useActiveCampaigns('bottom_banner', {
        autoRotate: true,
        rotationInterval: 15000 // 15 segundos
    });

    const { trackClick } = useAdTracking(currentCampaign?.id, true);

    // Si el usuario cierra el banner
    if (!isVisible) return null;

    if (loading) {
        return (
            <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-300 z-40">
                <div className="max-w-6xl mx-auto px-4 py-2">
                    <div className="h-12 md:h-20 bg-gray-200 rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!hasCampaigns || !currentCampaign) return null;

    const creative = currentCampaign.ad_creatives?.[0];
    if (!creative) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl z-40 animate-slide-up">
            <div className="max-w-6xl mx-auto px-4 py-2 relative">
                {/* Botón para cerrar */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 md:right-4 p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors z-10"
                    aria-label="Cerrar anuncio"
                >
                    <X className="w-4 h-4 text-gray-700" />
                </button>

                {/* Contenido del banner */}
                <div
                    className="cursor-pointer flex items-center justify-center md:justify-between space-x-4"
                    onClick={() => trackClick(creative.cta_url)}
                >
                    {/* Versión Desktop */}
                    <div className="hidden md:flex items-center space-x-4 flex-1">
                        {creative.image_url && (
                            <img
                                src={creative.image_url}
                                alt={creative.title}
                                className="h-20 w-auto object-contain rounded"
                            />
                        )}
                        <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-900">{creative.title}</h4>
                            {creative.description && (
                                <p className="text-sm text-gray-600 line-clamp-1">{creative.description}</p>
                            )}
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap">
                            {creative.cta_text || 'Ver más'}
                        </button>
                    </div>

                    {/* Versión Mobile */}
                    <div className="md:hidden flex items-center justify-between w-full pr-8">
                        {creative.image_url && (
                            <img
                                src={creative.image_url}
                                alt={creative.title}
                                className="h-12 w-auto object-contain rounded"
                            />
                        )}
                        <div className="flex-1 mx-3">
                            <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{creative.title}</h4>
                        </div>
                        <button className="bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded">
                            {creative.cta_text || 'Ver'}
                        </button>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="absolute bottom-0 left-4 text-xs text-gray-400">
                    Publicidad
                </div>
            </div>
        </div>
    );
}
