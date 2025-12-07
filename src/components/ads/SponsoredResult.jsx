// src/components/ads/SponsoredResult.jsx
import React from 'react';
import { MapPin, Phone, ExternalLink, Star } from 'lucide-react';
import useAdTracking from '../../hooks/useAdTracking';

/**
 * Resultado de búsqueda patrocinado (Primera Plana - PPC)
 * Aparece en los primeros 3 resultados de búsqueda
 * Modelo: Pago por click ($1.50 MXN/click)
 */
export default function SponsoredResult({ campaign, position = 1 }) {
    const { trackClick } = useAdTracking(campaign.id, true);
    const creative = campaign.ad_creatives?.[0];

    if (!creative) return null;

    return (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 mb-3 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group">
            {/* Badge "PATROCINADO" */}
            <div className="flex items-center justify-between mb-2">
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full flex items-center">
                    <Star className="w-3 h-3 mr-1 fill-yellow-900" />
                    RESULTADO PATROCINADO #{position}
                </span>
                <span className="text-xs text-gray-500">{campaign.advertiser_name}</span>
            </div>

            <div
                className="flex items-start space-x-4"
                onClick={() => trackClick(creative.cta_url)}
            >
                {/* Imagen o Logo */}
                <div className="flex-shrink-0 w-24 h-24 bg-white rounded-lg overflow-hidden border-2 border-yellow-200">
                    {creative.image_url ? (
                        <img
                            src={creative.image_url}
                            alt={creative.title}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-100 to-orange-100">
                            <span className="text-3xl">🏪</span>
                        </div>
                    )}
                </div>

                {/* Información */}
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {creative.title}
                    </h3>

                    {creative.description && (
                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                            {creative.description}
                        </p>
                    )}

                    {/* Metadatos */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-3">
                        {campaign.target_location && (
                            <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                                {campaign.target_location}
                            </div>
                        )}

                        {campaign.target_category && (
                            <span className="bg-white px-2 py-1 rounded-full border border-gray-300">
                                {campaign.target_category}
                            </span>
                        )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center space-x-2">
                        <button
                            className="flex items-center bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                trackClick(creative.cta_url);
                            }}
                        >
                            {creative.cta_text || 'Ver más'}
                            <ExternalLink className="w-4 h-4 ml-2" />
                        </button>

                        {campaign.advertiser_phone && (
                            <a
                                href={`tel:${campaign.advertiser_phone}`}
                                className="flex items-center bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                Llamar
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer con disclaimer */}
            <div className="mt-3 pt-3 border-t border-yellow-200">
                <p className="text-xs text-gray-500 text-center">
                    Este negocio está pagando para aparecer en los primeros resultados
                </p>
            </div>
        </div>
    );
}
