// src/components/ads/CarouselAd.jsx
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import useEnterprisePriorityCampaigns from '../../hooks/useEnterprisePriorityCampaigns';
import useAdTracking from '../../hooks/useAdTracking';
import GeobookerPromoPlaceholder from './GeobookerPromoPlaceholder';
import ReportAdButton from './ReportAdButton';

/**
 * Carrusel de negocios destacados (Primera Plana)
 * Ubicación: Antes de los resultados de búsqueda
 * Formato: Cards 280x200px en scroll horizontal
 * PRIORITY: Enterprise first, Local fallback
 * Si no hay campañas, muestra placeholder de Geobooker
 */
export default function CarouselAd() {
    const scrollRef = useRef(null);

    const { campaigns, hasCampaigns, loading, hasEnterprise } = useEnterprisePriorityCampaigns('featured_carousel', {
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

    // Show promo section with placeholder card when no campaigns
    if (!hasCampaigns) {
        return (
            <div className="my-8">
                <div className="flex items-center justify-between mb-4 px-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Negocios Destacados</h2>
                        <p className="text-sm text-gray-500">Espacios disponibles</p>
                    </div>
                </div>
                <div className="flex space-x-4 px-4">
                    <GeobookerPromoPlaceholder variant="card" rotate={false} />
                    <GeobookerPromoPlaceholder variant="card" rotate={false} />
                    <GeobookerPromoPlaceholder variant="card" rotate={false} />
                </div>
            </div>
        );
    }

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
 * Soporta tanto campañas enterprise (ad_creatives) como demo (creative_url directo)
 */
function CarouselCard({ campaign }) {
    const { trackClick } = useAdTracking(campaign.id, true);
    const creative = campaign.ad_creatives?.[0];

    // Fallback para campañas demo que no tienen ad_creatives
    const imageUrl = creative?.image_url || campaign.creative_url || null;
    const title = creative?.title || campaign.headline || campaign.advertiser_name;
    const description = creative?.description || campaign.description || '';
    const ctaText = creative?.cta_text || campaign.cta_text || 'Ver más';
    const ctaUrl = creative?.cta_url || campaign.cta_url || '#';

    return (
        <div
            className="flex-shrink-0 w-72 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => trackClick(ctaUrl)}
        >
            {/* Imagen */}
            <div className="relative h-40 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div
                    className={`w-full h-full items-center justify-center ${imageUrl ? 'hidden' : 'flex'}`}
                    style={{ display: imageUrl ? 'none' : 'flex' }}
                >
                    <p className="text-4xl">🏢</p>
                </div>

                {/* Badge patrocinado */}
                <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                    DESTACADO
                </span>
            </div>

            {/* Contenido */}
            <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
                    {title}
                </h3>

                {description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {description}
                    </p>
                )}

                {/* CTA Button */}
                <div className="flex items-center justify-between">
                    <button className="flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm group-hover:underline transition">
                        {ctaText}
                        <ExternalLink className="w-4 h-4 ml-1" />
                    </button>

                    {/* Anunciante y Reporte */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                            {campaign.advertiser_name}
                        </span>
                        <ReportAdButton
                            campaignId={campaign.id}
                            adSpaceType="featured_carousel"
                            variant="icon"
                            className="opacity-50 hover:opacity-100"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
