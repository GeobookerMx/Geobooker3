// src/components/ads/CarouselAd.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Star } from 'lucide-react';
import useEnterprisePriorityCampaigns from '../../hooks/useEnterprisePriorityCampaigns';
import useAdTracking from '../../hooks/useAdTracking';
import GeobookerPromoPlaceholder from './GeobookerPromoPlaceholder';
import ReportAdButton from './ReportAdButton';

/**
 * Carrusel de negocios destacados (Primera Plana)
 * - Auto-rotación cada 5 segundos
 * - Márgenes correctos en mobile/iOS/Android
 * - Scroll horizontal con snap
 * - Puntos de navegación
 */
export default function CarouselAd() {
    const scrollRef = useRef(null);
    const autoRotateRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const { campaigns, hasCampaigns, loading } = useEnterprisePriorityCampaigns('featured_carousel', {
        autoRotate: false
    });

    // Auto-rotación cada 5 segundos
    const scrollToIndex = useCallback((index) => {
        if (!scrollRef.current) return;
        const cards = scrollRef.current.querySelectorAll('[data-card]');
        if (cards[index]) {
            const card = cards[index];
            const container = scrollRef.current;
            // ✅ FIX: Usar scrollTo horizontal en el contenedor en vez de scrollIntoView (evita scroll vertical de la página)
            const targetLeft = card.offsetLeft - container.offsetLeft;
            container.scrollTo({ left: targetLeft, behavior: 'smooth' });
            setActiveIndex(index);
        }
    }, []);

    const startAutoRotate = useCallback(() => {
        if (autoRotateRef.current) clearInterval(autoRotateRef.current);
        autoRotateRef.current = setInterval(() => {
            setActiveIndex(prev => {
                const total = hasCampaigns ? campaigns.length : 3;
                const next = prev + 1 >= total ? 0 : prev + 1;
                if (scrollRef.current) {
                    const cards = scrollRef.current.querySelectorAll('[data-card]');
                    if (cards[next]) {
                        const card = cards[next];
                        const container = scrollRef.current;
                        // ✅ FIX: Usar scrollTo horizontal
                        const targetLeft = card.offsetLeft - container.offsetLeft;
                        container.scrollTo({ left: targetLeft, behavior: 'smooth' });
                    }
                }
                return next;
            });
        }, 5000);
    }, [hasCampaigns, campaigns]);

    useEffect(() => {
        startAutoRotate();
        return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current); };
    }, [startAutoRotate]);

    const scrollLeft = () => {
        startAutoRotate();
        const newIndex = Math.max(0, activeIndex - 1);
        scrollToIndex(newIndex);
    };

    const scrollRight = () => {
        startAutoRotate();
        const total = hasCampaigns ? campaigns.length : 3;
        const newIndex = activeIndex + 1 >= total ? 0 : activeIndex + 1;
        scrollToIndex(newIndex);
    };

    if (loading) {
        return (
            <div className="my-6 px-4">
                <div className="flex space-x-4 overflow-hidden">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex-shrink-0 w-72 h-52 bg-gray-200 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const totalItems = hasCampaigns ? campaigns.length : 3;

    return (
        <div className="my-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
                        Negocios Destacados
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {hasCampaigns ? 'Patrocinado' : 'Espacios disponibles · Anuncia aquí'}
                    </p>
                </div>

                {/* Controles */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={scrollLeft}
                        className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors active:scale-95"
                        aria-label="Anterior"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                        onClick={scrollRight}
                        className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors active:scale-95"
                        aria-label="Siguiente"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                </div>
            </div>

            {/* Carrusel — usa -mx-4 + px-4 para que las tarjetas lleguen al borde sin perder padding */}
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-3"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    // Padding horizontal para que la primera/última card no quede pegada al borde
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                }}
                onScroll={(e) => {
                    // Detectar card activa según scroll position
                    const scrollLeft = e.target.scrollLeft;
                    const cardWidth = 288 + 16; // w-72 + gap-4
                    const newIndex = Math.round(scrollLeft / cardWidth);
                    setActiveIndex(newIndex);
                }}
            >
                {hasCampaigns
                    ? campaigns.map((campaign, i) => (
                        <CarouselCard
                            key={campaign.id}
                            campaign={campaign}
                            isActive={i === activeIndex}
                        />
                    ))
                    : [0, 1, 2].map((i) => (
                        <div
                            key={i}
                            data-card
                            className="flex-shrink-0 snap-start"
                        >
                            <GeobookerPromoPlaceholder variant="card" rotate={false} />
                        </div>
                    ))
                }
            </div>

            {/* Puntos de navegación */}
            {totalItems > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                    {Array.from({ length: totalItems }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { startAutoRotate(); scrollToIndex(i); }}
                            className={`rounded-full transition-all duration-300 ${
                                i === activeIndex
                                    ? 'w-5 h-2 bg-blue-600'
                                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                            }`}
                            aria-label={`Ir a slide ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CarouselCard({ campaign, isActive }) {
    const { trackClick } = useAdTracking(campaign.id, true);
    const creative = campaign.ad_creatives?.[0];

    const imageUrl = creative?.image_url || campaign.creative_url || null;
    const title = creative?.title || campaign.headline || campaign.advertiser_name;
    const description = creative?.description || campaign.description || '';
    const ctaText = creative?.cta_text || campaign.cta_text || 'Ver más';
    const ctaUrl = creative?.cta_url || campaign.cta_url || '#';

    return (
        <div
            data-card
            className={`flex-shrink-0 w-72 snap-start bg-white border rounded-xl overflow-hidden shadow-md transition-all duration-300 cursor-pointer group ${
                isActive
                    ? 'border-blue-400 shadow-blue-100 shadow-lg scale-[1.02]'
                    : 'border-gray-200 hover:shadow-xl'
            }`}
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
                    className={`w-full h-full items-center justify-center`}
                    style={{ display: imageUrl ? 'none' : 'flex' }}
                >
                    <p className="text-5xl">🏢</p>
                </div>

                {/* Badge */}
                <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow">
                    DESTACADO
                </span>
            </div>

            {/* Contenido */}
            <div className="p-4">
                <h3 className="font-bold text-base text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {title}
                </h3>

                {description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-snug">
                        {description}
                    </p>
                )}

                <div className="flex items-center justify-between">
                    <button className="flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm gap-1">
                        {ctaText}
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 max-w-[80px] truncate">
                            {campaign.advertiser_name}
                        </span>
                        <ReportAdButton
                            campaignId={campaign.id}
                            adSpaceType="featured_carousel"
                            variant="icon"
                            className="opacity-40 hover:opacity-100"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
