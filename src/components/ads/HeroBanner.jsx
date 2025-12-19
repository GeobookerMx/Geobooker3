// src/components/ads/HeroBanner.jsx
import React, { useState, useEffect } from 'react';
import useActiveCampaigns from '../../hooks/useActiveCampaigns';
import useAdTracking from '../../hooks/useAdTracking';
import { loadEnterpriseCampaigns } from '../../services/adService';

/**
 * Banner principal de publicidad (Primera Plana)
 * Ubicación: Debajo del SearchBar en HomePage
 * Muestra: Enterprise campaigns + regular campaigns con rotación
 */
export default function HeroBanner() {
    const [enterpriseCampaigns, setEnterpriseCampaigns] = useState([]);
    const [enterpriseIndex, setEnterpriseIndex] = useState(0);

    // Load Enterprise campaigns with geo-targeting
    useEffect(() => {
        const loadEnterprise = async () => {
            const country = localStorage.getItem('userCountry') || 'unknown';
            const city = localStorage.getItem('userCity') || 'unknown';

            const campaigns = await loadEnterpriseCampaigns({ country, city });
            setEnterpriseCampaigns(campaigns);
        };
        loadEnterprise();
    }, []);

    // Regular campaigns from ad_spaces (local)
    const {
        currentCampaign: regularCampaign,
        hasCampaigns: hasRegular,
        loading,
        currentIndex,
        campaigns: regularCampaigns,
        goToCampaign
    } = useActiveCampaigns('hero_banner', {
        autoRotate: true,
        rotationInterval: 10000 // 10 segundos
    });

    // PRIORITY LOGIC: Enterprise first, local ONLY as fallback
    // If Enterprise campaigns exist, only show those
    // If NO Enterprise campaigns, then show local
    const hasEnterprise = enterpriseCampaigns.length > 0;
    const activeCampaigns = hasEnterprise ? enterpriseCampaigns : regularCampaigns;
    const currentCampaign = activeCampaigns[enterpriseIndex] || regularCampaign;
    const hasCampaigns = activeCampaigns.length > 0 || hasRegular;

    // Rotate through active campaigns
    useEffect(() => {
        if (activeCampaigns.length <= 1) return;
        const interval = setInterval(() => {
            setEnterpriseIndex(prev => (prev + 1) % activeCampaigns.length);
        }, hasEnterprise ? 8000 : 10000); // Enterprise: 8s, Local: 10s
        return () => clearInterval(interval);
    }, [activeCampaigns.length, hasEnterprise]);

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
                    {activeCampaigns.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                            {activeCampaigns.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEnterpriseIndex(index);
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all ${index === enterpriseIndex
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
