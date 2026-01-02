// src/components/ads/SponsoredFullwidth.jsx
// PRIORITY: Enterprise first, Local fallback
import React from 'react';
import useEnterprisePriorityCampaigns from '../../hooks/useEnterprisePriorityCampaigns';
import { ExternalLink, Star } from 'lucide-react';
import ReportAdButton from './ReportAdButton';

export default function SponsoredFullwidth({ context }) {
    const { currentCampaign, hasCampaigns, hasEnterprise } = useEnterprisePriorityCampaigns('sponsored_results_fullwidth', context);

    if (!hasCampaigns || !currentCampaign) return null;

    const creative = currentCampaign.ad_creatives?.[0];
    if (!creative) return null;

    const handleClick = () => {
        console.log('Fullwidth sponsored clicked:', currentCampaign.id);
        if (creative.target_url) {
            window.open(creative.target_url, '_blank');
        }
    };

    return (
        <div
            className="w-full bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-2 border-purple-300 rounded-xl overflow-hidden my-4 hover:shadow-xl transition-all cursor-pointer"
            onClick={handleClick}
        >
            <div className="flex flex-col md:flex-row">
                {/* Imagen */}
                {creative.image_url && (
                    <div className="md:w-1/3">
                        <img
                            src={creative.image_url}
                            alt={creative.title}
                            className="w-full h-48 md:h-full object-cover"
                        />
                    </div>
                )}

                {/* Contenido */}
                <div className={`${creative.image_url ? 'md:w-2/3' : 'w-full'} p-6 flex flex-col justify-center`}>
                    {/* Badge */}
                    <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-purple-600 fill-purple-600" />
                        <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">
                            Destacado Premium
                        </span>
                    </div>

                    {/* Título */}
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 hover:text-purple-600 transition">
                        {creative.title}
                    </h2>

                    {/* Descripción */}
                    <p className="text-gray-700 mb-4 line-clamp-2">
                        {creative.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>Por <span className="font-semibold text-purple-600">{currentCampaign.advertiser_name}</span></span>
                            <ReportAdButton
                                campaignId={currentCampaign.id}
                                adSpaceType="sponsored_fullwidth"
                                variant="text"
                                className="text-xs"
                            />
                        </div>

                        <button className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2">
                            {creative.cta_text || 'Ver oferta'}
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
