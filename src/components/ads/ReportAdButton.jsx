// src/components/ads/ReportAdButton.jsx
/**
 * Botón para reportar anuncios inapropiados
 * Se muestra en todos los componentes de anuncios (banners, cards, etc.)
 */
import React, { useState } from 'react';
import { Flag, X, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const REPORT_REASONS = [
    { value: 'inappropriate_content', label: '🚫 Contenido inapropiado', desc: 'Imágenes o texto no apto' },
    { value: 'misleading', label: '⚠️ Publicidad engañosa', desc: 'Información falsa o exagerada' },
    { value: 'offensive', label: '😤 Contenido ofensivo', desc: 'Discriminación, odio o violencia' },
    { value: 'spam', label: '📧 Spam / Repetitivo', desc: 'Aparece demasiado o es spam' },
    { value: 'illegal_product', label: '🚨 Producto ilegal', desc: 'Venta de productos prohibidos' },
    { value: 'wrong_targeting', label: '📍 Ubicación incorrecta', desc: 'No es relevante para mi zona' },
    { value: 'other', label: '❓ Otro problema', desc: 'Describir en comentarios' },
];

export default function ReportAdButton({
    campaignId,
    adSpaceType = 'unknown',
    variant = 'icon', // 'icon' | 'text' | 'full'
    className = ''
}) {
    const [showModal, setShowModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [details, setDetails] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            toast.error('Selecciona un motivo para el reporte');
            return;
        }

        setSubmitting(true);
        try {
            // Obtener usuario si está autenticado
            const { data: { user } } = await supabase.auth.getUser();

            const reportData = {
                campaign_id: campaignId,
                reporter_id: user?.id || null,
                reporter_email: user?.email || email || null,
                reason: selectedReason,
                details: details || null,
                ad_space_type: adSpaceType,
                page_url: window.location.href,
                user_location: null, // Podría agregarse geolocalización
                status: 'pending',
                priority: ['offensive', 'illegal_product'].includes(selectedReason) ? 'high' : 'normal'
            };

            const { error } = await supabase
                .from('ad_reports')
                .insert(reportData);

            if (error) throw error;

            toast.success('¡Gracias! Tu reporte ha sido enviado');
            setShowModal(false);
            setSelectedReason('');
            setDetails('');
        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error('Error al enviar el reporte. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowModal(true);
                }}
                className={`text-gray-400 hover:text-red-500 transition-colors ${className}`}
                title="Reportar anuncio"
                aria-label="Reportar anuncio"
            >
                {variant === 'icon' && <Flag className="w-4 h-4" />}
                {variant === 'text' && (
                    <span className="text-xs flex items-center gap-1">
                        <Flag className="w-3 h-3" /> Reportar
                    </span>
                )}
                {variant === 'full' && (
                    <span className="flex items-center gap-2 text-sm">
                        <Flag className="w-4 h-4" /> Reportar este anuncio
                    </span>
                )}
            </button>

            {/* Report Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowModal(false);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-5 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-6 h-6" />
                                    <h2 className="text-xl font-bold">Reportar Anuncio</h2>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1 hover:bg-white/20 rounded-lg transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-red-100 text-sm mt-1">
                                Ayúdanos a mantener la plataforma segura
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-5">
                            {/* Reason Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    ¿Por qué reportas este anuncio?
                                </label>
                                <div className="space-y-2">
                                    {REPORT_REASONS.map((reason) => (
                                        <button
                                            key={reason.value}
                                            onClick={() => setSelectedReason(reason.value)}
                                            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedReason === reason.value
                                                    ? 'border-red-500 bg-red-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium text-gray-800">
                                                {reason.label}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {reason.desc}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Detalles adicionales (opcional)
                                </label>
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Describe el problema con más detalle..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>

                            {/* Email for anonymous users */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tu email (para seguimiento)
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Opcional. No compartiremos tu email con el anunciante.
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-5 bg-gray-50 rounded-b-2xl flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedReason || submitting}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar Reporte
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
