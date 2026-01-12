// src/components/ads/RecommendedSection.jsx
import React from 'react';
import useActiveCampaigns from '../../hooks/useActiveCampaigns';
import { Star, MapPin, ExternalLink } from 'lucide-react';

export default function RecommendedSection({ context }) {
    const { currentCampaign, hasCampaigns } = useActiveCampaigns('recommended_section', context);

    if (!hasCampaigns || !currentCampaign) return null;

    const creative = currentCampaign.ad_creatives?.[0];

    // Fallback para campañas demo que no tienen ad_creatives
    const imageUrl = creative?.image_url || currentCampaign.creative_url || null;
    const title = creative?.title || currentCampaign.headline || currentCampaign.advertiser_name;
    const description = creative?.description || currentCampaign.description || '';
    const ctaText = creative?.cta_text || currentCampaign.cta_text || 'Ver detalles';
    const targetUrl = creative?.target_url || currentCampaign.cta_url || '#';

    const handleClick = () => {
        console.log('Recommended section clicked:', currentCampaign.id);
        if (targetUrl && targetUrl !== '#') {
            window.open(targetUrl, '_blank');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md border-2 border-yellow-300 overflow-hidden hover:shadow-xl transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-4">
                <div className="flex items-center gap-2 text-white">
                    <Star className="w-5 h-5 fill-white" />
                    <h3 className="font-bold text-lg">Recomendado para Ti</h3>
                </div>
            </div>

            {/* Card clickeable */}
            <div className="p-6 cursor-pointer" onClick={handleClick}>
                {/* Imagen */}
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                )}

                {/* Contenido */}
                <h4 className="text-xl font-bold text-gray-900 mb-2 hover:text-orange-600 transition">
                    {title}
                </h4>

                {description && (
                    <p className="text-gray-700 mb-4 line-clamp-3">
                        {description}
                    </p>
                )}

                {/* Ubicación */}
                {currentCampaign.target_location && (
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                        <MapPin className="w-4 h-4 mr-1 text-yellow-600" />
                        {currentCampaign.target_location}
                    </div>
                )}

                {/* CTA */}
                <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition flex items-center justify-center gap-2">
                    {ctaText}
                    <ExternalLink className="w-4 h-4" />
                </button>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 text-center">
                        Promocionado por <span className="font-semibold text-orange-600">{currentCampaign.advertiser_name}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

