// src/components/ads/HeroBanner.jsx
import React from 'react';
import useActiveCampaigns from '../../hooks/useActiveCampaigns';
import useAdTracking from '../../hooks/useAdTracking';

/**
 * Banner principal de publicidad (Primera Plana)
 * Ubicación: Debajo del SearchBar en HomePage
 * Tamaño: 728x90 (Desktop), 320x100 (Mobile)
 */
export default function HeroBanner() {
    const {
        currentCampaign,
        hasCampaigns,
        loading,
        currentIndex,
        campaigns,
        goToCampaign
    } = useActiveCampaigns('hero_banner', {
        autoRotate: true,
        rotationInterval: 10000 // 10 segundos
    });

    const { trackClick } = useAdTracking(
        currentCampaign?.id,
        true // Auto-track impression
    );

    if (loading) {
        return (
            <div className="w-full bg-gray-100 py-4 animate-pulse">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="h-24 bg-gray-300 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!hasCampaigns || !currentCampaign) {
        return null; // No mostrar nada si no hay campañas
    }

    const creative = currentCampaign.ad_creatives?.[0];

    if (!creative) return null;

    return (
        <div className="w-full bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 py-4 border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4">
                <div className="relative group">
                    {/* Banner Image o Contenido */}
                    {creative.image_url ? (
                        <div
                            className="relative cursor-pointer rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                            onClick={() => trackClick(creative.cta_url)}
                        >
                            <img
                                src={creative.image_url}
                                alt={creative.title}
                                className="w-full h-auto object-cover md:h-24 transform group-hover:scale-105 transition-transform duration-300"
                            />

                            {/* Overlay con gradiente */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                    ) : (
                        // Fallback: Banner con texto
                        <div
                            className="relative cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300"
                            onClick={() => trackClick(creative.cta_url)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold mb-1">
                                        {creative.title}
                                    </h3>
                                    {creative.description && (
                                        <p className="text-sm md:text-base text-blue-100">
                                            {creative.description}
                                        </p>
                                    )}
                                </div>
                                <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                                    {creative.cta_text || 'Ver más'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Badge "Publicidad" */}
                    <span className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                        Publicidad
                    </span>

                    {/* Indicadores de rotación (si hay múltiples campañas) */}
                    {campaigns.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                            {campaigns.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goToCampaign(index);
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                                            ? 'bg-white w-6'
                                            : 'bg-white/50 hover:bg-white/75'
                                        }`}
                                    aria-label={`Ver anuncio ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Información del anunciante (solo en hover en desktop) */}
                <div className="hidden md:block mt-2 text-center">
                    <p className="text-xs text-gray-500">
                        Anuncio de {currentCampaign.advertiser_name}
                    </p>
                </div>
            </div>
        </div>
    );
}
