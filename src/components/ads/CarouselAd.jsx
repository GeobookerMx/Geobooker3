// src/components/ads/CarouselAd.jsx
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import useActiveCampaigns from '../../hooks/useActiveCampaigns';
import useAdTracking from '../../hooks/useAdTracking';

/**
 * Carrusel de negocios destacados (Primera Plana)
 * Ubicación: Antes de los resultados de búsqueda
 * Formato: Cards 280x200px en scroll horizontal
 */
export default function CarouselAd() {
    const scrollRef = useRef(null);

    const { campaigns, hasCampaigns, loading } = useActiveCampaigns('featured_carousel', {
        autoRotate: false // Scroll manual por el usuario
    });

    if (loading) {
        return (
            <div className="my-6">
                <div className="flex space-x-4 overflow-hidden">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-shrink-0 w-72 h-52 bg-gray-200 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!hasCampaigns) return null;

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    return (
        <div className="my-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Negocios Destacados</h2>
                    <p className="text-sm text-gray-500">Patrocinado</p>
                </div>

                {/* Controles de navegación */}
                <div className="flex space-x-2">
                    <button
                        onClick={scrollLeft}
                        className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                        aria-label="Anterior"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                        onClick={scrollRight}
                        className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                        aria-label="Siguiente"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
            </div>

            {/* Carrusel de Cards */}
            <div
                ref={scrollRef}
                className="flex space-x-4 overflow-x-auto scrollbar-hide px-4 pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {campaigns.map((campaign) => (
                    <CarouselCard key={campaign.id} campaign={campaign} />
                ))}
            </div>
        </div>
    );
}

/**
 * Card individual del carrusel
 */
function CarouselCard({ campaign }) {
    const { trackClick } = useAdTracking(campaign.id, true);
    const creative = campaign.ad_creatives?.[0];

    if (!creative) return null;

    return (
        <div
            className="flex-shrink-0 w-72 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => trackClick(creative.cta_url)}
        >
            {/* Imagen */}
            <div className="relative h-40 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
                {creative.image_url ? (
                    <img
                        src={creative.image_url}
                        alt={creative.title}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-4xl">🏢</p>
                    </div>
                )}

                {/* Badge patrocinado */}
                <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                    DESTACADO
                </span>
            </div>

            {/* Contenido */}
            <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
                    {creative.title}
                </h3>

                {creative.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {creative.description}
                    </p>
                )}

                {/* CTA Button */}
                <div className="flex items-center justify-between">
                    <button className="flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm group-hover:underline transition">
                        {creative.cta_text || 'Ver más'}
                        <ExternalLink className="w-4 h-4 ml-1" />
                    </button>

                    {/* Anunciante */}
                    <span className="text-xs text-gray-400">
                        {campaign.advertiser_name}
                    </span>
                </div>
            </div>
        </div>
    );
}
