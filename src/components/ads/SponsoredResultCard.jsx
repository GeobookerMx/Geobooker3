// src/components/ads/SponsoredResultCard.jsx
// PRIORITY: Enterprise first, Local fallback
import React from 'react';
import useEnterprisePriorityCampaigns from '../../hooks/useEnterprisePriorityCampaigns';
import { ExternalLink, MapPin } from 'lucide-react';
import GeobookerPromoPlaceholder from './GeobookerPromoPlaceholder';

export default function SponsoredResultCard({ context, showPlaceholder = true }) {
    const { currentCampaign, hasCampaigns, hasEnterprise } = useEnterprisePriorityCampaigns('sponsored_results', context);

    // Show placeholder when no campaigns (if enabled)
    if (!hasCampaigns || !currentCampaign) {
        return showPlaceholder ? <GeobookerPromoPlaceholder variant="inline" rotate={true} /> : null;
    }

    const creative = currentCampaign.ad_creatives?.[0];
    if (!creative) {
        return showPlaceholder ? <GeobookerPromoPlaceholder variant="inline" rotate={true} /> : null;
    }

    const handleClick = () => {
        // Track click event
        console.log('Sponsored result clicked:', currentCampaign.id);
        if (creative.target_url) {
            window.open(creative.target_url, '_blank');
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-3 hover:shadow-md transition cursor-pointer"
            onClick={handleClick}>
            {/* Badge Patrocinado */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    ✨ PATROCINADO
                </span>
                {currentCampaign.target_location && (
                    <div className="flex items-center text-xs text-gray-600">
                        <MapPin className="w-3 h-3 mr-1" />
                        {currentCampaign.target_location}
                    </div>
                )}
            </div>

            <div className="flex items-start gap-4">
                {/* Imagen si existe */}
                {creative.image_url && (
                    <img
                        src={creative.image_url}
                        alt={creative.title}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                )}

                {/* Contenido */}
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 hover:text-blue-600 transition">
                        {creative.title}
                    </h3>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                        {creative.description}
                    </p>

                    {/* CTA */}
                    <div className="flex items-center gap-2">
                        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            {creative.cta_text || 'Ver más'}
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Anunciante */}
            <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                    Anuncio de <span className="font-semibold">{currentCampaign.advertiser_name}</span>
                </p>
            </div>
        </div>
    );
}
