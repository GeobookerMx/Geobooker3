// src/components/admin/CampaignDetailsModal.jsx
import React from 'react';
import { X, Calendar, DollarSign, Eye, MousePointer, Target, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export default function CampaignDetailsModal({ campaign, onClose }) {
    if (!campaign) return null;

    const creative = campaign.ad_creatives?.[0];
    const ctr = campaign.impressions > 0
        ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
        : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">{campaign.advertiser_name}</h2>
                        <p className="text-blue-100 text-sm mt-1">{campaign.advertiser_email}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center gap-4">
                        <span
                            className={`px-4 py-2 rounded-full text-sm font-semibold ${campaign.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : campaign.status === 'pending_review'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : campaign.status === 'paused'
                                        ? 'bg-gray-100 text-gray-800'
                                        : 'bg-red-100 text-red-800'
                                }`}
                        >
                            {campaign.status === 'active'
                                ? '✅ Campaña Activa'
                                : campaign.status === 'pending_review'
                                    ? '⏳ Pendiente de Revisión'
                                    : campaign.status === 'paused'
                                        ? '⏸️ Pausada'
                                        : '❌ Rechazada'}
                        </span>
                        <span className="text-sm text-gray-600">
                            ID: {campaign.id.substring(0, 8)}...
                        </span>
                    </div>

                    {/* Creative Preview */}
                    {creative && (
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                📸 Vista Previa del Anuncio
                            </h3>

                            {creative.image_url ? (
                                <div className="bg-white rounded-lg overflow-hidden shadow-md">
                                    <img
                                        src={creative.image_url}
                                        alt={creative.title}
                                        className="w-full h-64 object-cover"
                                    />
                                    <div className="p-4">
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">
                                            {creative.title}
                                        </h4>
                                        <p className="text-gray-600 mb-4">{creative.description}</p>
                                        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
                                            {creative.cta_text || 'Ver más'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg p-6 border-2 border-dashed border-gray-300">
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                                        {creative.title}
                                    </h4>
                                    <p className="text-gray-600 mb-4">{creative.description}</p>
                                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">
                                        {creative.cta_text || 'Ver más'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Espacio Publicitario */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="w-5 h-5 text-blue-600" />
                                <h3 className="font-semibold text-gray-900">Espacio Publicitario</h3>
                            </div>
                            <p className="text-lg font-bold text-blue-600">
                                {campaign.ad_spaces?.display_name}
                            </p>
                            <p className="text-sm text-gray-600">{campaign.ad_spaces?.type}</p>
                        </div>

                        {/* Segmentación Geográfica */}
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-5 h-5 text-green-600" />
                                <h3 className="font-semibold text-gray-900">Segmentación</h3>
                            </div>
                            <p className="text-lg font-bold text-green-600">
                                {campaign.geographic_scope === 'global'
                                    ? '🌍 Global'
                                    : campaign.geographic_scope === 'country'
                                        ? `🗺️ ${campaign.target_location || 'País'}`
                                        : campaign.geographic_scope === 'region'
                                            ? `📍 Región: ${campaign.target_location || 'No especificada'}`
                                            : campaign.geographic_scope === 'city'
                                                ? `🏙️ ${campaign.target_location || 'Ciudad'}`
                                                : 'No especificado'}
                            </p>
                            {campaign.audience_targeting && (
                                <p className="text-sm text-gray-600 mt-1">
                                    + Segmentación avanzada activa
                                </p>
                            )}
                        </div>

                        {/* Fechas */}
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-5 h-5 text-purple-600" />
                                <h3 className="font-semibold text-gray-900">Duración</h3>
                            </div>
                            <p className="text-sm text-gray-700">
                                <strong>Inicio:</strong>{' '}
                                {new Date(campaign.start_date).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">
                                <strong>Fin:</strong>{' '}
                                {new Date(campaign.end_date).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Presupuesto */}
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-5 h-5 text-yellow-600" />
                                <h3 className="font-semibold text-gray-900">Presupuesto</h3>
                            </div>
                            <p className="text-2xl font-bold text-yellow-600">
                                ${parseFloat(campaign.budget || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                                {campaign.ad_spaces?.name?.includes('result') ? 'Por clic (CPC)' : 'Mensual'}
                            </p>
                        </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            📊 Estadísticas de Rendimiento
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm text-gray-600">Impresiones</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {(campaign.impressions || 0).toLocaleString()}
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <MousePointer className="w-5 h-5 text-green-500" />
                                    <span className="text-sm text-gray-600">Clics</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {(campaign.clicks || 0).toLocaleString()}
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-5 h-5 text-purple-500" />
                                    <span className="text-sm text-gray-600">CTR</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {ctr}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                        >
                            Cerrar
                        </button>
                        {campaign.status === 'pending_review' && (
                            <>
                                <button
                                    onClick={async () => {
                                        try {
                                            const { error } = await supabase
                                                .from('ad_campaigns')
                                                .update({ status: 'active' })
                                                .eq('id', campaign.id);

                                            if (error) throw error;

                                            toast.success('✅ Campaña aprobada y activada');
                                            onClose();
                                            window.location.reload();
                                        } catch (error) {
                                            toast.error('Error al aprobar: ' + error.message);
                                        }
                                    }}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                                >
                                    ✅ Aprobar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('¿Estás seguro de rechazar esta campaña?')) return;

                                        try {
                                            const { error } = await supabase
                                                .from('ad_campaigns')
                                                .update({ status: 'rejected' })
                                                .eq('id', campaign.id);

                                            if (error) throw error;

                                            toast.success('❌ Campaña rechazada');
                                            onClose();
                                            window.location.reload();
                                        } catch (error) {
                                            toast.error('Error al rechazar: ' + error.message);
                                        }
                                    }}
                                    className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                                >
                                    ❌ Rechazar
                                </button>
                            </>
                        )}
                        {campaign.status === 'active' && (
                            <button
                                onClick={async () => {
                                    try {
                                        const { error } = await supabase
                                            .from('ad_campaigns')
                                            .update({ status: 'paused' })
                                            .eq('id', campaign.id);

                                        if (error) throw error;

                                        toast.success('⏸️ Campaña pausada');
                                        onClose();
                                        window.location.reload();
                                    } catch (error) {
                                        toast.error('Error al pausar: ' + error.message);
                                    }
                                }}
                                className="flex-1 bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 transition"
                            >
                                ⏸️ Pausar
                            </button>
                        )}
                        {campaign.status === 'paused' && (
                            <button
                                onClick={async () => {
                                    try {
                                        const { error } = await supabase
                                            .from('ad_campaigns')
                                            .update({ status: 'active' })
                                            .eq('id', campaign.id);

                                        if (error) throw error;

                                        toast.success('▶️ Campaña reactivada');
                                        onClose();
                                        window.location.reload();
                                    } catch (error) {
                                        toast.error('Error al reactivar: ' + error.message);
                                    }
                                }}
                                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                            >
                                ▶️ Reactivar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
