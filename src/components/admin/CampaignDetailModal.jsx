import React from 'react';
import { X, Check, MapPin, Globe, Smartphone, Calendar, DollarSign, ExternalLink } from 'lucide-react';

const CampaignDetailModal = ({ campaign, isOpen, onClose, onApprove, onReject }) => {
    if (!isOpen || !campaign) return null;

    const targeting = campaign.audience_targeting || {};
    const hasTargeting = Object.keys(targeting).length > 0;

    // Obtener primer creativo (asumiendo 1 por campaña por ahora)
    const creative = campaign.ad_creatives && campaign.ad_creatives[0] ? campaign.ad_creatives[0] : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Detalles de Campaña</h2>
                        <p className="text-gray-500 text-sm">ID: {campaign.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Columna Izquierda: Información Administrativa */}
                    <div className="space-y-6">
                        {/* Estado */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Estado Actual</h3>
                            <div className="flex items-center justify-between">
                                <span className={`px-3 py-1 text-sm font-bold rounded-full ${campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                                        campaign.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                    }`}>
                                    {campaign.status === 'active' ? 'ACTIVA' :
                                        campaign.status === 'pending_review' ? 'PENDIENTE DE REVISIÓN' :
                                            campaign.status.toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-600">
                                    Creada el: {new Date(campaign.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Datos del Anunciante */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                                Datos del Anunciante
                            </h3>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                                <p><span className="font-semibold">Nombre:</span> {campaign.advertiser_name}</p>
                                <p><span className="font-semibold">Email:</span> {campaign.advertiser_email}</p>
                                <p><span className="font-semibold">Presupuesto:</span> ${campaign.budget} MXN</p>
                            </div>
                        </div>

                        {/* Segmentación (Lo más importante para el admin) */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                                Segmentación y Alcance
                            </h3>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
                                <div className="flex items-start">
                                    <Globe className="w-5 h-5 mr-3 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-gray-900">Alcance Geográfico</p>
                                        <p className="text-gray-700">
                                            {campaign.geographic_scope === 'global' ? 'Global (Todo el mundo)' :
                                                `Específico: ${campaign.target_location}`}
                                        </p>
                                    </div>
                                </div>

                                {hasTargeting && (
                                    <div className="mt-2 pt-2 border-t border-blue-200">
                                        <p className="text-xs font-bold text-blue-800 uppercase mb-2">Reglas Avanzadas (JSON)</p>
                                        {targeting.countries && (
                                            <div className="text-sm mb-1">
                                                <span className="font-semibold">Países:</span> {targeting.countries.join(', ')}
                                            </div>
                                        )}
                                        {targeting.languages && (
                                            <div className="text-sm mb-1">
                                                <span className="font-semibold">Idiomas:</span> {targeting.languages.join(', ')}
                                            </div>
                                        )}
                                        {targeting.devices && (
                                            <div className="text-sm">
                                                <span className="font-semibold">Dispositivos:</span> {targeting.devices.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fechas */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                                Duración
                            </h3>
                            <p className="text-gray-700">
                                Del <strong>{new Date(campaign.start_date).toLocaleDateString()}</strong> al <strong>{new Date(campaign.end_date).toLocaleDateString()}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Columna Derecha: Preview del Creativo */}
                    <div className="bg-gray-100 rounded-xl p-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                        <h3 className="text-gray-500 font-semibold mb-6 uppercase tracking-wider">Preview del Anuncio</h3>

                        {creative ? (
                            <div className="w-full max-w-sm bg-white rounded-lg shadow-lg overflow-hidden transition-transform transform hover:scale-105">
                                {creative.image_url && (
                                    <img
                                        src={creative.image_url}
                                        alt={creative.title}
                                        className="w-full h-48 object-cover"
                                    />
                                )}
                                <div className="p-4">
                                    <h4 className="font-bold text-gray-900 text-lg mb-1">{creative.title}</h4>
                                    <p className="text-gray-600 text-sm mb-4">{creative.description}</p>

                                    <a
                                        href={creative.cta_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block w-full text-center bg-blue-600 text-white py-2 rounded font-semibold text-sm hover:bg-blue-700 transition"
                                    >
                                        {creative.cta_text || 'Ver Más'} <ExternalLink className="w-3 h-3 inline ml-1" />
                                    </a>
                                </div>
                                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 text-center border-t border-gray-100">
                                    Espacio: {campaign.ad_spaces?.display_name}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-400 text-center">
                                <p>No hay creativo asignado</p>
                            </div>
                        )}

                        <div className="mt-8 text-center text-xs text-gray-500">
                            * Esta es una previsualización aproximada. El aspecto final depende del dispositivo del usuario.
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4 rounded-b-xl sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition"
                    >
                        Cerrar
                    </button>
                    {campaign.status === 'pending_review' && (
                        <>
                            <button
                                onClick={() => onReject(campaign.id)}
                                className="px-6 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition flex items-center"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Rechazar
                            </button>
                            <button
                                onClick={() => onApprove(campaign.id)}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center shadow-lg hover:shadow-xl"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Aprobar Publicación
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignDetailModal;
