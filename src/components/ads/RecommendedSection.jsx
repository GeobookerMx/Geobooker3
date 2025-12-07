// src/components/ads/RecommendedSection.jsx
import React from 'react';
import useActiveCampaigns from '../../hooks/useActiveCampaigns';
import { Star, MapPin, ExternalLink } from 'lucide-react';

export default function RecommendedSection({ context }) {
    const { currentCampaign, hasCampaigns } = useActiveCampaigns('recommended_section', context);

    if (!hasCampaigns || !currentCampaign) return null;

    const creative = currentCampaign.ad_creatives?.[0];
    if (!creative) return null;

    const handleClick = () => {
        console.log('Recommended section clicked:', currentCampaign.id);
        if (creative.target_url) {
            window.open(creative.target_url, '_blank');
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
                {creative.image_url && (
                    <img
                        src={creative.image_url}
                        alt={creative.title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                )}

                {/* Contenido */}
                <h4 className="text-xl font-bold text-gray-900 mb-2 hover:text-orange-600 transition">
                    {creative.title}
                </h4>

                <p className="text-gray-700 mb-4 line-clamp-3">
                    {creative.description}
                </p>

                {/* Ubicación */}
                {currentCampaign.target_location && (
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                        <MapPin className="w-4 h-4 mr-1 text-yellow-600" />
                        {currentCampaign.target_location}
                    </div>
                )}

                {/* CTA */}
                <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition flex items-center justify-center gap-2">
                    {creative.cta_text || 'Ver detalles'}
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
